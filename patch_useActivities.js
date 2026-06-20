const fs = require('fs');

let code = fs.readFileSync('src/hooks/useCalendarQueries.ts', 'utf8');

if (!code.includes("import { rrulestr } from 'rrule'")) {
  code = "import { rrulestr } from 'rrule'\n" + code;
}

const targetFunc = `export function useActivities(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: () => getActivities(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}`;

const replaceFunc = `export function useActivities(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: async () => {
      const activities = await getActivities(startDate, endDate)
      
      const expandedActivities: Activity[] = []
      const exceptionsByParentId: Record<string, Activity[]> = {}
      const addedExceptionIds = new Set<string>()
      
      // Separate exceptions
      activities.forEach(act => {
        if (act.parent_activity_id) {
          if (!exceptionsByParentId[act.parent_activity_id]) {
            exceptionsByParentId[act.parent_activity_id] = []
          }
          exceptionsByParentId[act.parent_activity_id].push(act)
        }
      })

      activities.forEach(act => {
        if (act.parent_activity_id) return
        
        if (act.recurrence_rule) {
          try {
            const dtstart = new Date(act.start_time)
            const durationMs = new Date(act.end_time).getTime() - dtstart.getTime()
            const dtstartStr = dtstart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
            const rruleStr = \`DTSTART:\${dtstartStr}\\nRRULE:\${act.recurrence_rule}\`
            const rule = rrulestr(rruleStr)

            const startLimit = new Date(startDate)
            const endLimit = new Date(endDate)

            // Get occurrences in the month
            const occurrences = rule.between(startLimit, endLimit, true)
            
            occurrences.forEach(occ => {
              const exceptions = exceptionsByParentId[act.id] || []
              const matchingException = exceptions.find(e => 
                e.original_start_time && new Date(e.original_start_time).getTime() === occ.getTime()
              )

              if (matchingException) {
                addedExceptionIds.add(matchingException.id)
                if (!matchingException.deleted_at) {
                  expandedActivities.push(matchingException)
                }
              } else {
                const newStartTime = new Date(occ.getTime())
                const newEndTime = new Date(occ.getTime() + durationMs)
                expandedActivities.push({
                  ...act,
                  id: \`\${act.id}_\${occ.getTime()}\`,
                  start_time: newStartTime.toISOString(),
                  end_time: newEndTime.toISOString(),
                  original_start_time: occ.toISOString() // useful for edits
                })
              }
            })
          } catch (e) {
            console.error('Failed to parse rrule for activity:', act.id, e)
            expandedActivities.push(act)
          }
        } else {
          expandedActivities.push(act)
        }
      })

      // Add standalone exceptions (e.g. moved into this month from outside)
      activities.forEach(act => {
        if (act.parent_activity_id && !addedExceptionIds.has(act.id) && !act.deleted_at) {
          expandedActivities.push(act)
        }
      })

      return expandedActivities
    },
    enabled: !!startDate && !!endDate,
  })
}`;

code = code.replace(targetFunc, replaceFunc);

fs.writeFileSync('src/hooks/useCalendarQueries.ts', code);
console.log("Successfully updated useCalendarQueries.ts");
