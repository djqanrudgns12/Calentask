import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useActivities } from '@/hooks/useCalendarQueries'

export const COLORS = ['#F43F5E', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#64748B']

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

  return {
    categories,
    isCategoriesLoading,
    newCatName,
    setNewCatName,
    newCatColor,
    setNewCatColor,
    handleCreate,
    isCreating: createCategory.isPending,
    handleDelete,
    isDeleting: deleteCategory.isPending,
    getUsageCount
  }
}
