import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getActivities, getCategories, createActivity, updateActivity, deleteActivity, createCategory, updateCategory, deleteCategory, getDeletedActivities, restoreActivity, hardDeleteActivity, emptyTrash, searchActivities, getCategoryPresets, createCategoryPreset, updateCategoryPreset, deleteCategoryPreset, type Activity, type Category } from '@/app/actions/calendar'
import { getUserProfile, updateUserProfile } from '@/app/actions/profile'

export const SYS_ANNIVERSARY_CATEGORY: Category = {
  id: 'sys-anniversary',
  name: '기념일',
  hex_color: '#8B5CF6',
  is_default: true,
  user_id: 'system'
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await getCategories()
      return [...data, SYS_ANNIVERSARY_CATEGORY]
    },
    // 참조 데이터: realtime 구독·mutation invalidation이 갱신을 보장
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, hexColor }: { name: string, hexColor: string }) => createCategory(name, hexColor),
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      const optimisticCategory: Category = {
        id: `temp-${Date.now()}`,
        name: newCategory.name,
        hex_color: newCategory.hexColor,
        is_default: false,
        user_id: 'temp-user'
      }
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => old ? [...old, optimisticCategory] : [optimisticCategory])
      return { previousCategories }
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, hexColor }: { id: string, name: string, hexColor: string }) => updateCategory(id, name, hexColor),
    onMutate: async (updatedCat) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => 
        old?.map(cat => cat.id === updatedCat.id ? { ...cat, name: updatedCat.name, hex_color: updatedCat.hexColor } : cat)
      )
      return { previousCategories }
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      // 카테고리 색상 변경 시 연관 일정/템플릿의 hex_color도 서버에서 변경되므로 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
      queryClient.invalidateQueries({ queryKey: ['activity_templates'] })
    }
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => 
        old?.filter(cat => cat.id !== id)
      )
      return { previousCategories }
    },
    onError: (err, id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useCategoryPresets() {
  return useQuery({
    queryKey: ['category_presets'],
    queryFn: () => getCategoryPresets(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, categoryIds }: { name: string, categoryIds: string[] }) => createCategoryPreset(name, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
    }
  })
}

export function useUpdateCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string, name: string }) => updateCategoryPreset(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
    }
  })
}

export function useDeleteCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategoryPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
    }
  })
}

export function useActivities(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: async () => {
      const activities = await getActivities(startDate, endDate)
      const { expandActivities } = await import('@/lib/expandActivities')
      return expandActivities(activities, startDate, endDate)
    },
    enabled: enabled && !!startDate && !!endDate,
    placeholderData: keepPreviousData,
  })
}

// 낙관적 업데이트 대상 카테고리 객체를 캐시에서 즉시 확보 (색상 즉시 반영)
function pickCategoriesFromCache(queryClient: ReturnType<typeof useQueryClient>, categoryIds: string[]) {
  const allCategories = queryClient.getQueryData<Category[]>(['categories']) || []
  return allCategories.filter(c => categoryIds.includes(c.id))
}

export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, categoryIds }: { payload: Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>, categoryIds: string[] }) =>
      createActivity(payload, categoryIds),
    onMutate: async (newActivityData) => {
      // 캘린더가 보고 있는 날짜 범위와 무관하게 캐시된 모든 범위에 즉시 반영
      // (기존에는 고정된 '이번 달' 키에만 써서 실제 조회 키와 불일치 → 낙관적 반영이 동작하지 않았음)
      await queryClient.cancelQueries({ queryKey: ['activities'] })

      const previousQueries = queryClient.getQueriesData<Activity[]>({ queryKey: ['activities'] })
      const optimisticCategories = pickCategoriesFromCache(queryClient, newActivityData.categoryIds)
      const tempId = `temp-${Date.now()}`

      const optimisticActivity: Activity = {
        id: tempId,
        user_id: 'temp',
        title: newActivityData.payload.title,
        start_time: newActivityData.payload.start_time,
        end_time: newActivityData.payload.end_time,
        is_all_day: newActivityData.payload.is_all_day,
        memo: newActivityData.payload.memo || null,
        type: newActivityData.payload.type,
        hex_color: newActivityData.payload.hex_color || null,
        template_id: newActivityData.payload.template_id || null,
        deleted_at: null,
        categories: optimisticCategories,
        attachments: [],
        reminders: newActivityData.payload.reminders || [],
        recurrence_rule: newActivityData.payload.recurrence_rule || null,
        parent_activity_id: newActivityData.payload.parent_activity_id || null,
        original_start_time: newActivityData.payload.original_start_time || null
      }

      queryClient.setQueriesData<Activity[]>({ queryKey: ['activities'] }, (old) =>
        old ? [...old, optimisticActivity] : old
      )

      return { previousQueries, tempId, optimisticCategories }
    },
    onSuccess: (activity, _variables, context) => {
      // 임시 행을 서버 행으로 치환 (백그라운드 재조회 완료 전에도 실제 ID 확보)
      queryClient.setQueriesData<Activity[]>({ queryKey: ['activities'] }, (old) =>
        old?.map(a => a.id === context.tempId ? { ...a, ...activity, categories: context.optimisticCategories } : a)
      )
    },
    onError: (_err, _newActivityData, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
    }
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload, categoryIds }: { id: string, payload: Partial<Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>>, categoryIds: string[] }) =>
      updateActivity(id, payload, categoryIds),
    onMutate: async (newActivityData) => {
      await queryClient.cancelQueries({ queryKey: ['activities'] })

      const previousQueries = queryClient.getQueriesData<Activity[]>({ queryKey: ['activities'] })
      const optimisticCategories = pickCategoriesFromCache(queryClient, newActivityData.categoryIds)

      queryClient.setQueriesData<Activity[]>({ queryKey: ['activities'] }, (old) =>
        old?.map(activity =>
          activity.id === newActivityData.id
            ? { ...activity, ...newActivityData.payload, categories: optimisticCategories }
            : activity
        )
      )
      return { previousQueries }
    },
    onError: (_err, _newActivityData, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
    }
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onMutate: async (id) => {
      // 현재 캐시된 모든 activities 쿼리를 취소하고 낙관적 업데이트
      await queryClient.cancelQueries({ queryKey: ['activities'] })
      await queryClient.cancelQueries({ queryKey: ['pendingActivities'] })
      
      // 모든 ['activities', ...] 쿼리 데이터에서 삭제 대상 제거
      const queriesData = queryClient.getQueriesData<Activity[]>({ queryKey: ['activities'] })
      const previousQueries = queriesData.map(([key, data]) => [key, data] as const)
      
      queriesData.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(key, data.filter(a => a.id !== id))
        }
      })

      // pendingActivities 캐시에서도 낙관적으로 즉시 제거
      const previousPending = queryClient.getQueryData<Activity[]>(['pendingActivities'])
      if (previousPending) {
        queryClient.setQueryData(
          ['pendingActivities'],
          previousPending.filter(a => a.id !== id)
        )
      }
      
      return { previousQueries, previousPending }
    },
    onError: (_err, _id, context) => {
      // 에러 시 모든 쿼리를 이전 상태로 롤백
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      // pendingActivities도 롤백
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingActivities'], context.previousPending)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
      queryClient.invalidateQueries({ queryKey: ['pendingActivities'] })
    }
  })
}

export function useDeletedActivities() {
  return useQuery({
    queryKey: ['deleted_activities'],
    queryFn: () => getDeletedActivities(),
  })
}

export function useRestoreActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

export function useHardDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hardDeleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

export function useEmptyTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: () => getUserProfile(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { full_name?: string; username?: string; avatar_url?: string; recovery_email?: string }) => updateUserProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
  })
}

import { updateUserPassword } from '@/app/actions/profile'

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => updateUserPassword(password),
  })
}

export function useSearchActivities(query: string) {
  return useQuery({
    queryKey: ['searchActivities', query],
    queryFn: () => searchActivities(query),
    enabled: query.length > 1, // 2글자 이상일 때만 검색
  })
}

import {
  getAcademicSources,
  getAcademicEvents,
  searchAcademicEvents,
  getExclusionRules,
  registerAcademicSource,
  applyResyncAcademicSource,
  updateAcademicSource,
  deleteAcademicSource,
  updateAcademicEvent,
  deleteAcademicEvents,
  addExclusionRule,
  deleteExclusionRule,
} from '@/app/actions/academicData'

// ── 학사일정 데이터 관리 ──
function invalidateAcademic(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['academic_sources'] })
  queryClient.invalidateQueries({ queryKey: ['academic_events'] })
  queryClient.invalidateQueries({ queryKey: ['academic_search'] })
  queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
  queryClient.invalidateQueries({ queryKey: ['activities'] }) // 메인 캘린더 병합 반영
}

export function useAcademicSources() {
  return useQuery({
    queryKey: ['academic_sources'],
    queryFn: () => getAcademicSources(),
  })
}

export function useAcademicEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['academic_events', startDate, endDate],
    queryFn: () => getAcademicEvents(startDate, endDate),
    enabled: !!startDate && !!endDate,
    placeholderData: keepPreviousData,
  })
}

export function useExclusionRules() {
  return useQuery({
    queryKey: ['exclusion_rules'],
    queryFn: () => getExclusionRules(),
  })
}

export function useSearchAcademicEvents(params: { query?: string; sourceId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['academic_search', params],
    queryFn: () => searchAcademicEvents(params),
  })
}

export function useRegisterAcademicSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { url: string; year: number; label?: string }) => registerAcademicSource(input),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useApplyResyncAcademicSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sourceId: string) => applyResyncAcademicSource(sourceId),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useUpdateAcademicSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceId, patch }: { sourceId: string; patch: { label?: string | null; category_id?: string | null; year?: number } }) =>
      updateAcademicSource(sourceId, patch),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useDeleteAcademicSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sourceId: string) => deleteAcademicSource(sourceId),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useUpdateAcademicEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { date?: string; title?: string } }) => updateAcademicEvent(id, patch),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useDeleteAcademicEvents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteAcademicEvents(ids),
    onSuccess: () => invalidateAcademic(queryClient),
  })
}

export function useAddExclusionRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keyword: string) => addExclusionRule(keyword),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exclusion_rules'] }),
  })
}

export function useDeleteExclusionRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExclusionRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exclusion_rules'] }),
  })
}

import { getPendingActivities, assignCategoryToPendingActivity } from '@/app/actions/calendar'

export function usePendingActivities() {
  return useQuery({
    queryKey: ['pendingActivities'],
    queryFn: () => getPendingActivities(),
    staleTime: 30_000,
  })
}

export function useAssignCategoryToPendingActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, categoryId }: { activityId: string, categoryId: string }) => 
      assignCategoryToPendingActivity(activityId, categoryId),
    onMutate: async ({ activityId }) => {
      // 진행 중인 refetch 취소 (optimistic 데이터 덮어쓰기 방지)
      await queryClient.cancelQueries({ queryKey: ['pendingActivities'] })
      
      // 이전 데이터 스냅샷 (rollback용)
      const previousPending = queryClient.getQueryData(['pendingActivities'])
      
      // Optimistic: UI에서 해당 일정 즉시 제거
      queryClient.setQueryData(['pendingActivities'], (old: Activity[] | undefined) =>
        old ? old.filter(item => item.id !== activityId) : []
      )
      
      return { previousPending }
    },
    onError: (_err, _vars, context) => {
      // 실패 시 이전 상태로 복원
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingActivities'], context.previousPending)
      }
    },
    onSettled: () => {
      // 성공/실패 모두 최종적으로 서버 데이터와 동기화
      queryClient.invalidateQueries({ queryKey: ['pendingActivities'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
    },
  })
}

