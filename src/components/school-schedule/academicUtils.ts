import { NEIS_API_KEY } from './neisUtils'
import { Activity, Category } from '@/app/actions/calendar'
import { format, parseISO } from 'date-fns'

export interface AcademicEventRaw {
  ATPT_OFCDC_SC_CODE: string
  SD_SCHUL_CODE: string
  AY: string
  AA_YMD: string
  EVENT_NM: string
  EVENT_CNTNT: string | null
  ONE_GRADE_EVENT_YN: string
  TW_GRADE_EVENT_YN: string
  THREE_GRADE_EVENT_YN: string
  FR_GRADE_EVENT_YN: string
  FIV_GRADE_EVENT_YN: string
  SIX_GRADE_EVENT_YN: string
  SBTR_DD_SC_NM: string // "휴업일" 등
}

// 필터 조건: 시험/평가, 휴업일/방학, 교내행사
export type AcademicEventType = 'EXAM' | 'HOLIDAY' | 'EVENT'

export function getAcademicEventType(eventName: string, holidayName: string): AcademicEventType {
  if (eventName.includes('고사') || eventName.includes('평가') || eventName.includes('지필') || eventName.includes('모의')) {
    return 'EXAM'
  }
  if (holidayName.includes('휴업일') || holidayName.includes('공휴일') || eventName.includes('방학') || eventName.includes('개교기념일')) {
    return 'HOLIDAY'
  }
  return 'EVENT'
}

export async function getAcademicSchedule(
  officeCode: string, 
  schoolCode: string, 
  fromYmd: string, 
  toYmd: string
): Promise<Activity[]> {
  const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=1000&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${fromYmd}&AA_TO_YMD=${toYmd}`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('학사일정을 불러오는데 실패했습니다.')
  
  const data = await res.json()
  if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
    return [] 
  }
  
  const rows: AcademicEventRaw[] = data.SchoolSchedule?.[1]?.row || []
  
  // 가상의 카테고리 (읽기 전용 뷰용)
  const mockCategory: Category = {
    id: 'school_schedule_cat',
    user_id: 'system',
    name: '학교',
    hex_color: '#3B82F6', // Blue default
    is_default: false
  }
  
  return rows.map((row) => {
    // YYYYMMDD -> YYYY-MM-DD
    const dateStr = `${row.AA_YMD.slice(0,4)}-${row.AA_YMD.slice(4,6)}-${row.AA_YMD.slice(6,8)}`
    const type = getAcademicEventType(row.EVENT_NM, row.SBTR_DD_SC_NM)
    
    let color = '#3B82F6' // EVENT
    if (type === 'EXAM') color = '#EF4444' // Red
    if (type === 'HOLIDAY') color = '#10B981' // Green
    
    // 대상 학년 파싱
    const targetGrades = []
    if (row.ONE_GRADE_EVENT_YN === 'Y') targetGrades.push('1')
    if (row.TW_GRADE_EVENT_YN === 'Y') targetGrades.push('2')
    if (row.THREE_GRADE_EVENT_YN === 'Y') targetGrades.push('3')
    if (row.FR_GRADE_EVENT_YN === 'Y') targetGrades.push('4')
    if (row.FIV_GRADE_EVENT_YN === 'Y') targetGrades.push('5')
    if (row.SIX_GRADE_EVENT_YN === 'Y') targetGrades.push('6')
    const gradeStr = targetGrades.length > 0 ? `대상: ${targetGrades.join(', ')}학년` : '대상: 전체'
    
    const memo = `분류: ${type === 'EXAM' ? '시험' : type === 'HOLIDAY' ? '휴업일' : '행사'}
${gradeStr}
비고: ${row.SBTR_DD_SC_NM !== '해당없음' ? row.SBTR_DD_SC_NM : ''}`.trim()

    return {
      id: `neis_${row.AA_YMD}_${row.EVENT_NM}`,
      user_id: 'system',
      title: row.EVENT_NM,
      start_time: `${dateStr}T00:00:00Z`,
      end_time: `${dateStr}T23:59:59Z`,
      is_all_day: true,
      memo: memo,
      type: 'EVENT',
      hex_color: color,
      template_id: null,
      deleted_at: null,
      categories: [{...mockCategory, hex_color: color}],
      attachments: [],
      reminders: null,
      recurrence_rule: null,
      parent_activity_id: null,
      original_start_time: null,
      // 메타데이터에 학사일정 플래그 및 타입을 저장하기 위해 google_event_id 필드를 임시 활용 (프론트에서 구분용)
      google_event_id: `NEIS_SCHEDULE_TYPE_${type}` 
    } as Activity
  })
}
