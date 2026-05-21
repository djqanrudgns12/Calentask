import { useDeletedActivities, useRestoreActivity, useHardDeleteActivity, useEmptyTrash } from '@/hooks/useCalendarQueries'

export function useDataHub() {
  const { data: deletedActivities = [], isLoading } = useDeletedActivities()
  const restoreActivity = useRestoreActivity()
  const hardDeleteActivity = useHardDeleteActivity()
  const emptyTrash = useEmptyTrash()

  const handleRestore = (id: string) => {
    restoreActivity.mutate(id)
  }

  const handleHardDelete = (id: string) => {
    if (confirm('이 일정을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      hardDeleteActivity.mutate(id)
    }
  }

  const handleEmptyTrash = () => {
    if (confirm('휴지통을 비우시겠습니까? 모든 일정이 영구 삭제됩니다.')) {
      emptyTrash.mutate()
    }
  }

  return {
    deletedActivities,
    isLoading,
    handleRestore,
    isRestoring: restoreActivity.isPending,
    handleHardDelete,
    isHardDeleting: hardDeleteActivity.isPending,
    handleEmptyTrash,
    isEmptyingTrash: emptyTrash.isPending
  }
}
