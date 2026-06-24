export const NEIS_API_KEY = 'cefedc8bc1294ccf904b8ddf9bb815cf'

export interface SchoolInfo {
  officeCode: string
  schoolCode: string
  schoolName: string
  address: string
}

export interface MealInfo {
  mealType: string // 조식, 중식, 석식
  menuItems: string[]
  calories: string
  allergies: string
}

export async function searchSchools(keyword: string): Promise<SchoolInfo[]> {
  if (!keyword.trim()) return []
  
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=50&SCHUL_NM=${encodeURIComponent(keyword)}`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('학교 검색에 실패했습니다.')
  
  const data = await res.json()
  if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
    return [] // No results
  }
  
  const rows = data.schoolInfo?.[1]?.row || []
  return rows.map((row: any) => ({
    officeCode: row.ATPT_OFCDC_SC_CODE,
    schoolCode: row.SD_SCHUL_CODE,
    schoolName: row.SCHUL_NM,
    address: row.ORG_RDNMA
  }))
}

export async function getSchoolMeals(officeCode: string, schoolCode: string, dateStr: string): Promise<MealInfo[]> {
  const formattedDate = dateStr.replace(/-/g, '') // e.g., 20260625
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=3&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${formattedDate}`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('급식 정보를 불러오는데 실패했습니다.')
  
  const data = await res.json()
  if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
    return [] // No meals found
  }
  
  const rows = data.mealServiceDietInfo?.[1]?.row || []
  
  return rows.map((row: any) => {
    // DDISH_NM examples: "혼합잡곡밥<br/>쇠고기미역국<br/>순살아귀강정(1.5.6)<br/>배추김치(9)"
    // CAL_INFO: "750.0 Kcal"
    
    // 알레르기 정보 추출 (괄호 안의 숫자들)
    // 원래 나이스 API는 메뉴명 뒤에 괄호로 알레르기 정보를 줍니다. 
    // 정규식으로 이를 깔끔하게 분리합니다.
    const rawMenuString = row.DDISH_NM || ''
    const menuItemsList = rawMenuString.split('<br/>').map((m: string) => m.trim()).filter(Boolean)
    
    // 전체 식단의 알레르기 수집 (중복 제거용 Set)
    const allergySet = new Set<string>()
    const cleanMenuItems: string[] = []

    menuItemsList.forEach((item: string) => {
      // "순살아귀강정 (1.5.6.)" 또는 "배추김치(9)" 에서 알레르기 번호 추출
      const match = item.match(/\(([\d\.]+)\)$/)
      let cleanName = item
      
      if (match) {
        cleanName = item.replace(/\([\d\.]+\)$/, '').trim()
        const numbers = match[1].split('.').filter(Boolean)
        numbers.forEach(n => allergySet.add(n))
      }
      cleanMenuItems.push(cleanName)
    })

    const allergiesMap: Record<string, string> = {
      '1': '난류', '2': '우유', '3': '메밀', '4': '땅콩', '5': '대두', 
      '6': '밀', '7': '고등어', '8': '게', '9': '새우', '10': '돼지고기', 
      '11': '복숭아', '12': '토마토', '13': '아황산류', '14': '호두', 
      '15': '닭고기', '16': '쇠고기', '17': '오징어', '18': '조개류', '19': '잣'
    }

    const sortedAllergies = Array.from(allergySet)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(num => `${num}. ${allergiesMap[num] || '기타'}`)
      .join('   ') // 여러 개일 경우 간격을 둠

    return {
      mealType: row.MMEAL_SC_NM, // 조식, 중식, 석식
      menuItems: cleanMenuItems,
      calories: row.CAL_INFO,
      allergies: sortedAllergies
    }
  })
}
