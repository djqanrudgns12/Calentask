import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useActivities } from '@/hooks/useCalendarQueries'

export const COLORS = [
  // Red & Pink & Rose
  '#ef4444', '#f43f5e', '#ec4899', '#d946ef',
  // Purple & Indigo
  '#a855f7', '#8b5cf6', '#6366f1', '#4f46e5',
  // Blue & Cyan
  '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
  // Teal & Green & Emerald
  '#10b981', '#22c55e', '#84cc16', '#a3e635',
  // Yellow & Orange & Amber
  '#eab308', '#f59e0b', '#f97316', '#ea580c',
  // Gray & Neutral & Slate
  '#64748b', '#78716c', '#52525b', '#334155'
]

export function useTagsManagement() {
  const { data: categories, isLoading: isCategoriesLoading } = useCategories()
  // 모든 일정을 불러와서 카테고리별 사용량 계산용
  const { data: allActivities } = useActivities('2020-01-01', '2030-12-31') 
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])

  const handleCreate = () => {
    if (!newCatName.trim()) return
    createCategory.mutate(
      { name: newCatName, hexColor: newCatColor },
      {
        onSuccess: () => {
          setNewCatName('')
        }
      }
    )
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`'${name}' 카테고리를 삭제하시겠습니까? 이 카테고리가 지정된 일정에서 카테고리가 해제됩니다.`)) {
      deleteCategory.mutate(id)
    }
  }

  const getUsageCount = (categoryId: string) => {
    return allActivities?.filter(a => a.categories?.some(c => c.id === categoryId)).length || 0
  }

  const getTotalUsageCount = () => {
    return allActivities?.filter(a => a.categories && a.categories.length > 0).length || 0
  }

  return {
    categories,
    isCategoriesLoading,
    allActivities,
    newCatName,
    setNewCatName,
    newCatColor,
    setNewCatColor,
    handleCreate,
    isCreating: createCategory.isPending,
    handleDelete,
    isDeleting: deleteCategory.isPending,
    getUsageCount,
    getTotalUsageCount
  }
}
