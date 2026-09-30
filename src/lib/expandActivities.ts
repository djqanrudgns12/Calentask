import { rrulestr } from 'rrule'
import type { Activity } from '@/app/actions/calendar'

/** 요청 범위 안에서 반복 마스터와 예외를 실제 캘린더 인스턴스로 전개합니다. */
export function expandActivities(activities: Activity[], startDate: string, endDate: string): Activity[] {
  const expandedActivities: Activity[] = []
  const exceptionsByParentId = new Map<string, Map<number, Activity>>()
  const addedExceptionIds = new Set<string>()
  const rangeStart = new Date(startDate)
  const rangeEnd = new Date(endDate)

  activities.forEach(activity => {
    if (!activity.parent_activity_id) return
    if (!activity.original_start_time) return
    const exceptions = exceptionsByParentId.get(activity.parent_activity_id) ?? new Map<number, Activity>()
    const originalStartMs = Date.parse(activity.original_start_time)
    // 동일 회차의 첫 예외를 사용하는 기존 동작을 보존한다.
    if (!exceptions.has(originalStartMs)) exceptions.set(originalStartMs, activity)
    exceptionsByParentId.set(activity.parent_activity_id, exceptions)
  })

  activities.forEach(activity => {
    if (activity.parent_activity_id) return

    if (!activity.recurrence_rule) {
      expandedActivities.push(activity)
      return
    }

    try {
      const startsAt = new Date(activity.start_time)
      const durationMs = new Date(activity.end_time).getTime() - startsAt.getTime()
      const dtstart = startsAt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const rule = rrulestr(`DTSTART:${dtstart}\nRRULE:${activity.recurrence_rule}`)
      const occurrences = rule.between(rangeStart, rangeEnd, true)

      occurrences.forEach(occurrence => {
        const exception = exceptionsByParentId.get(activity.id)?.get(occurrence.getTime())

        if (exception) {
          addedExceptionIds.add(exception.id)
          if (!exception.deleted_at) expandedActivities.push(exception)
          return
        }

        expandedActivities.push({
          ...activity,
          id: `${activity.id}_${occurrence.getTime()}`,
          start_time: occurrence.toISOString(),
          end_time: new Date(occurrence.getTime() + durationMs).toISOString(),
          original_start_time: occurrence.toISOString(),
        })
      })
    } catch (error) {
      console.error('Failed to parse rrule for activity:', activity.id, error)
      expandedActivities.push(activity)
    }
  })

  activities.forEach(activity => {
    if (activity.parent_activity_id && !addedExceptionIds.has(activity.id) && !activity.deleted_at) {
      expandedActivities.push(activity)
    }
  })

  return expandedActivities
}
