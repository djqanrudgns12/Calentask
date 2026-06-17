declare module 'luckyexcel' {
  interface ExportJson {
    sheets: any[];
    info: any;
  }

  const LuckyExcel: {
    transformExcelToLucky(
      file: File,
      callback: (exportJson: ExportJson, luckysheetfile: any) => void
    ): void;
    transformExcelToLuckyByUrl(
      url: string,
      name: string,
      callback: (exportJson: ExportJson, luckysheetfile: any) => void
    ): void;
    transformLuckyToExcel(
      luckyFile: any,
      callback: (blob: Blob) => void
    ): void;
  };

  export default LuckyExcel;
}
