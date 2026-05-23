import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { NicePayload } from '@/app/actions/niceImport'

export type ParseResult = {
  recordType: '출장' | '근무상황'
  payloads: NicePayload[]
}

/**
 * 나이스 복무 파일(CSV 또는 XLSX)을 파싱하여 정제된 페이로드 배열로 반환합니다.
 */
export async function parseNiceFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as Record<string, string>[]
            const parsed = processRawData(data)
            resolve(parsed)
          } catch (err) {
            reject(err)
          }
        },
        error: (err) => reject(err),
      })
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' })
          const parsed = processRawData(json)
          resolve(parsed)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = (err) => reject(err)
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일을 업로드해주세요.'))
    }
  })
}

/**
 * 추출된 JSON 배열을 규칙에 맞게 매핑하고 정제합니다.
 */
function processRawData(data: Record<string, string>[]): ParseResult {
  if (data.length === 0) {
    throw new Error('파일에 데이터가 없습니다.')
  }

  const firstRow = data[0]
  
  // 파일 유형 식별
  const isBusinessTrip = '출장종류' in firstRow && '출장지' in firstRow
  const isWorkStatus = '근무상황' in firstRow && '사유 또는 용무' in firstRow

  if (!isBusinessTrip && !isWorkStatus) {
    throw new Error('올바른 나이스 복무/출장 파일이 아닙니다. 헤더를 확인해주세요.')
  }

  const recordType: '출장' | '근무상황' = isBusinessTrip ? '출장' : '근무상황'
  const payloads: NicePayload[] = []

  for (const row of data) {
    // 1. 결재상태 필터링 (완결만 허용)
    if (row['결재상태'] !== '완결') {
      continue
    }

    try {
      let title = ''
      let memo = ''
      let start_time = ''
      let end_time = ''

      if (recordType === '출장') {
        title = row['출장목적'] || '출장'
        memo = `- 출장 종류: ${row['출장종류'] || ''}\n- 출장지: ${row['출장지'] || ''}`
        
        // 날짜 파싱: "2026.05.29 15:00 ~ 2026.05.29 16:40"
        const periodStr = row['출장기간'] || ''
        if (periodStr.includes('~')) {
          const [startStr, endStr] = periodStr.split('~').map(s => s.trim().replace(/\./g, '-'))
          start_time = new Date(`${startStr.replace(' ', 'T')}:00+09:00`).toISOString()
          end_time = new Date(`${endStr.replace(' ', 'T')}:00+09:00`).toISOString()
        }
      } else {
        // 근무상황
        title = row['근무상황'] || '근무상황'
        
        const dest = row['목적지']?.trim()
        const reason = row['사유 또는 용무']?.trim() || ''

        // C안 적용: 목적지 빈칸 시 생략
        if (dest && dest !== '') {
          memo = `- 목적지: ${dest}\n- 사유 또는 용무: ${reason}`
        } else {
          memo = `- 사유 또는 용무: ${reason}`
        }

        // 날짜 파싱: "2026-05-22 15:40 ~ 2026-05-22 16:40"
        const periodStr = row['기간'] || ''
        if (periodStr.includes('~')) {
          const [startStr, endStr] = periodStr.split('~').map(s => s.trim())
          start_time = new Date(`${startStr.replace(' ', 'T')}:00+09:00`).toISOString()
          end_time = new Date(`${endStr.replace(' ', 'T')}:00+09:00`).toISOString()
        }
      }

      // 날짜 파싱이 유효하지 않은 경우 무시
      if (!start_time || !end_time) continue

      payloads.push({
        title,
        start_time,
        end_time,
        memo,
        type: 'EVENT',
        is_all_day: false,
        hex_color: null // 카테고리 색상을 따르도록 null
      })
    } catch (e) {
      console.warn('Row parsing error', e, row)
      continue
    }
  }

  return { recordType, payloads }
}
