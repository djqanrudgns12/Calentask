import sys

with open('src/lib/google-calendar.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "/**\n * Creates or updates an event in Google Calendar.\n * Uses Custom Event ID for O(1) lookup instead of list API search.\n */\nexport async function syncActivityToGoogle(userId: string, activity: any, categories: any[] = []) {"

end_marker = "/**\n * Deletes an event from Google Calendar."

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    sys.exit(1)

new_logic = """/**
 * 범용적인 Google API 에러 판별 유틸리티
 */
function isGoogleError(err: any, code: number): boolean {
  if (!err) return false;
  const status = err.response?.status || err.status || parseInt(err.code);
  if (status === code) return true;
  
  const msg = err.message?.toLowerCase() || '';
  if (code === 404 && msg.includes('not found')) return true;
  if (code === 409 && msg.includes('conflict')) return true;
  if (code === 400 && msg.includes('bad request')) return true;
  if (code === 410 && msg.includes('deleted')) return true;
  
  return false;
}

/**
 * Creates or updates an event in Google Calendar.
 * Uses Custom Event ID for O(1) lookup instead of list API search.
 */
export async function syncActivityToGoogle(userId: string, activity: any, categories: any[] = []) {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase.from('users').select('google_sync_settings').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    if (settings.direction === 'IMPORT_ONLY') return

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    let calendarId = await getSyncCalendarId(userId, auth, supabase, categories, settings)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    const eventBody = mapActivityToGoogleEvent(activity, categories, settings)

    if (activity.parent_activity_id) {
      const parentEventId = toGoogleEventId(activity.parent_activity_id)
      try {
        await calendar.events.get({ calendarId, eventId: parentEventId })
        ;(eventBody as any).recurringEventId = parentEventId
        if (activity.original_start_time) {
          const originalStart = activity.is_all_day 
            ? { date: activity.original_start_time.split('T')[0] }
            : { dateTime: activity.original_start_time, timeZone: 'Asia/Seoul' }
          ;(eventBody as any).originalStartTime = originalStart
        }
      } catch (parentErr: any) {
        // Fallback: Custom ID로 부모를 못 찾으면 기존 extendedProperty 검색
        if (isGoogleError(parentErr, 404)) {
          try {
            const parentSearchResult = await calendar.events.list({
              calendarId,
              privateExtendedProperty: [`calentask_id=${activity.parent_activity_id}`],
            })
            const existingParentEvent = parentSearchResult.data.items?.[0]
            if (existingParentEvent?.id) {
              (eventBody as any).recurringEventId = existingParentEvent.id
              if (activity.original_start_time) {
                const originalStart = activity.is_all_day 
                  ? { date: activity.original_start_time.split('T')[0] }
                  : { dateTime: activity.original_start_time, timeZone: 'Asia/Seoul' }
                ;(eventBody as any).originalStartTime = originalStart
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    const googleEventId = toGoogleEventId(activity.id)
    let finalGoogleEventId = googleEventId

    // 1차 시도: Update (Custom ID 기준)
    try {
      await calendar.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: eventBody,
      })
      await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time })
    } catch (updateErr: any) {
      if (isGoogleError(updateErr, 400)) {
        // 색상 매핑 등의 문제로 400 발생 시, 부가 속성 제거하고 재시도
        delete (eventBody as any).colorId
        if ((eventBody as any).reminders) delete (eventBody as any).reminders
        try {
          await calendar.events.update({
            calendarId,
            eventId: googleEventId,
            requestBody: eventBody,
          })
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '기본 속성 오류로 인해 일부 속성(색상 등)을 제외하고 동기화되었습니다.' })
          return
        } catch (e) {
          // 그래도 실패하면 아래 로직으로 진행 (updateErr를 그대로 유지)
        }
      }

      if (!isGoogleError(updateErr, 404)) {
        await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: updateErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
        throw updateErr
      }

      // 404 Not Found 발생 시 (이벤트 없음 OR 캘린더 없음) -> List로 확인
      let searchResult
      try {
        searchResult = await calendar.events.list({
          calendarId,
          privateExtendedProperty: [`calentask_id=${activity.id}`],
        })
      } catch (listErr: any) {
        if (isGoogleError(listErr, 404)) {
          // 캘린더 자체가 없음이 확실함 -> 그룹 매핑 및 설정 초기화 후 새 캘린더 생성
          let updatedSettings = { ...settings }
          let needsSettingsUpdate = false
          
          if (settings.groupMapping) {
            const newMapping = { ...settings.groupMapping }
            for (const [catId, mappedCalId] of Object.entries(newMapping)) {
              if (mappedCalId === calendarId) {
                delete newMapping[catId]
                needsSettingsUpdate = true
              }
            }
            if (needsSettingsUpdate) {
              updatedSettings.groupMapping = newMapping
              await supabase.from('users').update({ google_sync_settings: updatedSettings }).eq('id', userId)
            }
          }
          
          const { data: u } = await supabase.from('users').select('google_sync_calendar_id').eq('id', userId).single()
          if (u?.google_sync_calendar_id === calendarId) {
            await supabase.from('users').update({ google_sync_calendar_id: null, google_sync_calendar_name: null }).eq('id', userId)
          }
          
          const newCalendarId = await getSyncCalendarId(userId, auth, supabase, categories, updatedSettings)
          if (!newCalendarId) {
            throw new Error('Failed to create a new sync calendar.')
          }
          calendarId = newCalendarId // 새 캘린더 아이디로 업데이트

          // 새 캘린더이므로 검색 결과는 무조건 없음
          searchResult = { data: { items: [] } }
        } else {
          throw listErr
        }
      }

      const existingEvent = searchResult.data.items?.[0]
      if (existingEvent?.id) {
        try {
          await calendar.events.update({
            calendarId,
            eventId: existingEvent.id,
            requestBody: eventBody,
          })
          finalGoogleEventId = existingEvent.id
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time })
        } catch (fallbackUpdateErr: any) {
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: fallbackUpdateErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
          throw fallbackUpdateErr
        }
      } else {
        // 2차 시도: Insert (Custom ID 포함)
        try {
          const inserted = await calendar.events.insert({
            calendarId,
            requestBody: { ...eventBody, id: googleEventId },
          })
          finalGoogleEventId = inserted.data.id || googleEventId
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time })
        } catch (insertErr: any) {
          let isRecovered = false;

          // 조건 A: 404 & 부모 일정 의존성 오류
          if (isGoogleError(insertErr, 404) && (eventBody as any).recurringEventId) {
            delete (eventBody as any).recurringEventId
            try {
              const retryInsert = await calendar.events.insert({
                calendarId,
                requestBody: { ...eventBody, id: googleEventId }
              })
              finalGoogleEventId = retryInsert.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '부모 일정을 찾을 수 없어 독립된 일정으로 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e // 다음 조건문들 혹은 최후의 수단을 타도록 덮어씀
            }
          }

          // 조건 B: 409 Conflict (삭제된 이벤트의 ID와 충돌)
          if (!isRecovered && isGoogleError(insertErr, 409)) {
            try {
              (eventBody as any).status = 'confirmed'
              const revived = await calendar.events.update({
                calendarId,
                eventId: googleEventId,
                requestBody: eventBody,
              })
              finalGoogleEventId = revived.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '삭제된(Tombstone) 일정 아이디 충돌을 극복하고 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e
            }
          }

          // 조건 C: 400 Bad Request (colorId 등 유효성)
          if (!isRecovered && isGoogleError(insertErr, 400)) {
            delete (eventBody as any).colorId
            if ((eventBody as any).reminders) delete (eventBody as any).reminders
            try {
              const retryInsert = await calendar.events.insert({
                calendarId,
                requestBody: { ...eventBody, id: googleEventId }
              })
              finalGoogleEventId = retryInsert.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '속성 유효성 오류(400)로 일부 데이터 제외 후 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e
            }
          }

          // 최후의 수단: Custom ID를 버리고 순수 데이터만 Insert
          if (!isRecovered) {
            try {
              delete (eventBody as any).recurringEventId
              delete (eventBody as any).colorId
              if ((eventBody as any).reminders) delete (eventBody as any).reminders

              const fallbackInserted = await calendar.events.insert({
                calendarId,
                requestBody: eventBody,
              })
              finalGoogleEventId = fallbackInserted.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '모든 복구 실패 후 Google 자동 할당 ID로 신규 생성되었습니다.' })
            } catch (finalErr: any) {
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: finalErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
              throw finalErr
            }
          }
        }
      }
    }

    // activities 테이블에 google_event_id 저장 (히스토리 센터 연동용)
    try {
      await supabase.from('activities').update({ google_event_id: finalGoogleEventId }).eq('id', activity.id)
    } catch (dbErr) {
      console.error('Failed to save google_event_id:', dbErr)
    }
  } catch (error: any) {
    console.error('Failed to sync activity to Google Calendar:', error)
    await logSyncHistory(createAdminClient(), { userId, activityId: activity.id, calendarId: 'unknown', action: 'ERROR', status: 'FAILED', errorMessage: error.message, activityTitle: activity.title, activityStartTime: activity.start_time })
  }
}

\n"""

new_content = content[:start_idx] + new_logic + content[end_idx:]

with open('src/lib/google-calendar.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Modification complete.")
