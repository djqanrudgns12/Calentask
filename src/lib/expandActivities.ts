import { rrulestr } from 'rrule'
import type { Activity } from '@/app/actions/calendar'

/** 요청 범위 안에서 반복 마스터와 예외를 실제 캘린더 인스턴스로 전개합니다. */
export function expandActivities(activities: Activity[], startDate: string, endDate: string): Activity[] {
  const expandedActivities: Activity[] = []
  const exceptionsByParentId: Record<string, Activity[]> = {}
  const addedExceptionIds = new Set<string>()

  activities.forEach(activity => {
    if (!activity.parent_activity_id) return
    const exceptions = exceptionsByParentId[activity.parent_activity_id] || []
    exceptions.push(activity)
    exceptionsByParentId[activity.parent_activity_id] = exceptions
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
      const occurrences = rule.between(new Date(startDate), new Date(endDate), true)

      occurrences.forEach(occurrence => {
        const exception = (exceptionsByParentId[activity.id] || []).find(candidate =>
          candidate.original_start_time
          && new Date(candidate.original_start_time).getTime() === occurrence.getTime()
        )

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
