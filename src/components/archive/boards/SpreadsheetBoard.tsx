'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import './SpreadsheetBoard.css';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Download, Upload } from 'lucide-react';
import LuckyExcel from 'luckyexcel';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ============================================================
// 헬퍼: data(2D 밀집 배열) → celldata(희소 배열) 변환
// FortuneSheet는 초기화 시 celldata 형식을 요구합니다.
// onChange 콜백은 data(밀집) 형태를 반환하므로,
// 저장된 데이터를 다시 Workbook에 넘길 때 이 변환이 필수입니다.
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
// - data 필드가 있으면 celldata로 변환 후 data 제거
// - celldata만 있으면 그대로 사용
// ============================================================
function normalizeSheetForInit(sheet: any): any {
  const normalized = { ...sheet };
  if (normalized.data && !normalized.celldata) {
    normalized.celldata = dataToCelldata(normalized.data);
  }
  // FortuneSheet 초기화 시 data 필드가 있으면 충돌할 수 있으므로 제거
  delete normalized.data;
  
  // celldata가 없으면 빈 배열로
  if (!normalized.celldata) {
    normalized.celldata = [];
  }
  return normalized;
}

// 디바운스 타이머 ref용 (모듈 레벨)
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function SpreadsheetBoard() {
  const { activeTabId, spreadsheetData, updateSpreadsheetData } = useArchiveStore();
  const workbookRef = useRef<any>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const savedData = activeTabId ? spreadsheetData[activeTabId] : null;

  // 빈 시트(100행 x 20열) 초기 템플릿 — celldata(희소 배열) 형식 사용
  const defaultData = useMemo(() => [{
    name: 'Sheet1',
    color: '',
    status: 1,
    order: 0,
    celldata: [],  // 빈 셀: celldata 비어 있음
    row: 100,
    column: 20,
    config: {},
    id: 'sheet_01',
  }], []);

  // 저장된 데이터를 FortuneSheet 초기화 형식으로 정규화
  const sheetData = useMemo(() => {
    if (savedData && savedData.length > 0) {
      return savedData.map(normalizeSheetForInit);
    }
    return defaultData;
  }, [savedData, defaultData]);

  // onChange: 디바운싱을 적용하여 연속 편집 시 성능 보호
  const handleOnChange = useCallback((updatedData: any) => {
    if (!activeTabId) return;
    
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      updateSpreadsheetData(activeTabId, updatedData);
    }, 1500); // 1.5초 디바운싱
  }, [activeTabId, updateSpreadsheetData]);

  // 컴포넌트 언마운트 시 디바운스 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  // ============================================================
  // Import: .xlsx 파일을 FortuneSheet 데이터로 변환
  // ============================================================
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTabId) return;

    LuckyExcel.transformExcelToLucky(file, function(exportJson: any) {
      if (!exportJson.sheets || exportJson.sheets.length === 0) {
        alert("파일을 읽을 수 없습니다. 올바른 .xlsx 파일인지 확인해 주세요.");
        return;
      }
      // luckyexcel이 반환하는 시트 데이터를 그대로 저장
      // (FortuneSheet가 다시 마운트될 때 normalizeSheetForInit로 정규화됨)
      updateSpreadsheetData(activeTabId, exportJson.sheets);
    });
    
    // input 리셋 (동일 파일 재선택 허용)
    e.target.value = '';
  }, [activeTabId, updateSpreadsheetData]);

  // ============================================================
  // Export: 현재 시트 데이터를 .xlsx 파일로 내보내기
  // workbookRef를 통해 FortuneSheet API로 실제 런타임 데이터를 가져옴
  // ============================================================
  const handleExport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    
    // workbookRef를 통해 현재 모든 시트의 최신 데이터를 가져옴
    let sheets: any[] | null = null;
    try {
      if (workbookRef.current?.getAllSheets) {
        sheets = workbookRef.current.getAllSheets();
      }
    } catch {
      // 폴백: 저장된 데이터 사용
    }
    
    const sourceData = sheets || sheetData;
    if (!sourceData || sourceData.length === 0) return;
    
    sourceData.forEach((sheet: any) => {
      const wsData: any[][] = [];

      if (sheet.data) {
        // data(2D 밀집 배열)가 있는 경우
        sheet.data.forEach((row: any[]) => {
          const rowData: any[] = [];
          if (row) {
            row.forEach((cell: any) => {
              if (cell && typeof cell === 'object') {
                // 수식이 있으면 수식을 내보내고, 아니면 표시값(m) 또는 원시값(v)
                rowData.push(cell.f ? cell.f : (cell.m !== undefined ? cell.m : cell.v ?? null));
              } else {
                rowData.push(cell ?? null);
              }
            });
          }
          wsData.push(rowData);
        });
      } else if (sheet.celldata) {
        // celldata(희소 배열)만 있는 경우 2D 배열로 재구성
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
      const sheetName = (sheet.name || 'Sheet1').substring(0, 31); // Excel 시트명 31자 제한
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `spreadsheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [sheetData]);

  // ============================================================
  // 단축키 충돌 격리 (앱 전역 단축키와 스프레드시트 단축키 분리)
  // ============================================================
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    
    // Cmd+K (커맨드 팔레트), Cmd+N (새 노트) 등 앱 단축키는 상위로 전파 허용
    if (isMod && (e.key === 'k' || e.key === 'n')) {
      return; // 전파 허용
    }
    
    // 나머지 키보드 이벤트는 시트 내부에서만 처리하도록 전파 차단
    // (방향키, Ctrl+C/V/Z, Ctrl+F, Enter, Tab, Delete 등)
    e.stopPropagation();
  }, []);

  if (!isClient) return null;

  return (
    <div className="w-full h-full flex flex-col relative spreadsheet-container overflow-hidden bg-white">
      {/* 툴바 (다크모드 지원 UI) */}
      <div className="px-4 py-2.5 bg-card/95 backdrop-blur-sm flex items-center justify-between shrink-0 border-b border-border/60 z-10">
         <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase hidden md:inline">스프레드시트</span>
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
      
      {/* 시트 캔버스 (항상 화이트 테마 유지) */}
      <div 
        className="flex-1 w-full relative fortune-sheet-wrapper" 
        style={{ minHeight: 0 }}
        onKeyDown={handleKeyDown}
      >
        <Workbook 
          ref={workbookRef}
          data={sheetData} 
          onChange={handleOnChange}
          lang="ko"
        />
      </div>
    </div>
  );
}
