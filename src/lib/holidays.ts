import Holidays from 'date-holidays'
import { isSameDay } from 'date-fns'

const hd = new Holidays('KR')

export function getHolidaysForYear(year: number) {
  return hd.getHolidays(year)
}

export function isKoreanHoliday(date: Date) {
  return hd.isHoliday(date)
}

export function getHolidayName(date: Date) {
  const holidays = hd.isHoliday(date)
  if (holidays && holidays.length > 0) {
    return holidays[0].name
  }
  return null
}
