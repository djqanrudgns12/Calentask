'use client'

import React, { useRef, useEffect, useState } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Download, Upload, Search } from 'lucide-react';
import LuckyExcel from 'luckyexcel';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function SpreadsheetBoard() {
  const { activeTabId, spreadsheetData, updateSpreadsheetData } = useArchiveStore();
  const workbookRef = useRef<any>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const data = activeTabId ? spreadsheetData[activeTabId] : null;

  // 빈 시트(100행 20열) 초기 템플릿
  const defaultData = [{
    name: 'Sheet1',
    color: '',
    status: 1,
    order: 0,
    data: Array.from({ length: 100 }, () => Array.from({ length: 20 }, () => null)),
    config: {},
    index: 'sheet_01'
  }];

  const sheetData = data && data.length > 0 ? data : defaultData;

  const handleOnChange = (updatedData: any) => {
    if (!activeTabId) return;
    updateSpreadsheetData(activeTabId, updatedData);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    LuckyExcel.transformExcelToLucky(file, function(exportJson: any, luckysheetfile: any) {
      if(exportJson.sheets == null || exportJson.sheets.length == 0){
          alert("파일 읽기 실패");
          return;
      }
      if (activeTabId) {
        // 기존 데이터를 덮어씌움
        updateSpreadsheetData(activeTabId, exportJson.sheets);
      }
    });
    
    // reset input
    e.target.value = '';
  };

  const handleExport = () => {
    if (!sheetData || sheetData.length === 0) return;
    
    // 단순 셀 데이터만 추출하여 .xlsx로 내보내기 (서식은 제외된 기본 버전)
    const wb = XLSX.utils.book_new();
    
    sheetData.forEach((sheet: any) => {
       const wsData: any[][] = [];
       if (sheet.data) {
         sheet.data.forEach((row: any[]) => {
           const rowData: any[] = [];
           if (row) {
             row.forEach((cell: any) => {
               rowData.push(cell ? cell.v : null);
             });
           }
           wsData.push(rowData);
         });
       }
       const ws = XLSX.utils.aoa_to_sheet(wsData);
       XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet1');
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `archive_spreadsheet_${activeTabId}.xlsx`);
  };

  const handleSearch = () => {
    alert("시트 내에서 Ctrl+F (Cmd+F) 단축키를 눌러 전역 검색 및 바꾸기를 사용할 수 있습니다.");
  };

  if (!isClient) return null;

  return (
    <div className="w-full h-full flex flex-col relative spreadsheet-container overflow-hidden rounded-2xl bg-white border border-border">
      {/* 툴바 (다크모드 지원 UI) */}
      <div className="px-4 py-3 bg-card/90 flex items-center justify-between shrink-0 border-b border-border/60 z-10">
         <div className="flex items-center gap-3">
            <button 
              onClick={handleSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <Search className="w-4 h-4" /> 찾기 (Ctrl+F)
            </button>
         </div>
         <div className="flex gap-2">
           <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm cursor-pointer transition-colors active:scale-95">
             <Upload className="w-4 h-4" /> <span>가져오기</span>
             <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
           </label>
           <button 
             onClick={handleExport}
             className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm transition-colors active:scale-95"
           >
             <Download className="w-4 h-4" /> <span>내보내기</span>
           </button>
         </div>
      </div>
      
      {/* 시트 캔버스 (항상 화이트 테마 유지) */}
      <div 
        className="flex-1 w-full h-full relative fortune-sheet-wrapper" 
        onKeyDown={(e) => {
          // 커맨드 팔레트(Cmd+K) 등 앱 단축키와 충돌 방지
          if (e.key !== 'k' && e.key !== 'n') {
            e.stopPropagation();
          }
        }}
      >
        <Workbook 
          ref={workbookRef}
          data={sheetData} 
          onChange={handleOnChange}
          lang="ko"
        />
      </div>

      {/* CSS 캡슐화 */}
      <style jsx global>{`
        .spreadsheet-container .fortune-sheet-wrapper {
           /* 내부 다크모드 무시하고 항상 흰색 배경 */
           background-color: #ffffff;
        }
        .spreadsheet-container .luckysheet-wrap {
          color: #333333 !important;
        }
        /* 툴바 아이콘 및 배경 등 구글 시트 스타일 */
        .spreadsheet-container .luckysheet-toolbar {
          background-color: #f3f4f6 !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .spreadsheet-container .luckysheet-toolbar-button {
          color: #4b5563 !important;
        }
        .spreadsheet-container .luckysheet-toolbar-button:hover {
          background-color: #e5e7eb !important;
        }
        .spreadsheet-container .luckysheet-grid-container {
          background-color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
