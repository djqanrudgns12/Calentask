'use client'

import { useDeletedActivities, useRestoreActivity, useHardDeleteActivity, useEmptyTrash } from '@/hooks/useCalendarQueries'
import { Button } from '@/components/ui/button'
import { Trash2, RefreshCcw, Loader2, Database, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export function DataTab() {
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

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto py-4">
      {/* 데이터 허브 헤더 */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-900">데이터 허브</h3>
          </div>
          <p className="text-sm text-indigo-700/80 leading-relaxed">
            캘린더의 데이터를 안전하게 관리하세요. 삭제된 데이터는 휴지통에 보관되며, 원할 때 언제든 복구하거나 완전히 삭제할 수 있습니다.
          </p>
        </div>
      </section>

      {/* 휴지통 관리 */}
      <section className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-800">휴지통 관리</h3>
          </div>
          {deletedActivities.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEmptyTrash}
              disabled={emptyTrash.isPending}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              {emptyTrash.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              휴지통 비우기
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-600">보관된 항목 ({deletedActivities.length})</p>
          </div>
          
          <div className="p-4 max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-sm text-slate-500">데이터를 불러오는 중...</p>
              </div>
            ) : deletedActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <AlertCircle className="w-10 h-10 mb-3 text-slate-300" />
                <p>휴지통이 비어있습니다.</p>
              </div>
            ) : (
              deletedActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors group">
                  <div className="flex flex-col overflow-hidden mr-4">
                    <span className="text-sm font-bold text-slate-800 truncate mb-0.5">{activity.title}</span>
                    <span className="text-xs font-medium text-slate-400 truncate flex items-center gap-1.5">
                      {format(new Date(activity.start_time), 'yyyy년 MM월 dd일')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRestore(activity.id)}
                      disabled={restoreActivity.isPending}
                      className="h-8 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      title="복구"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleHardDelete(activity.id)}
                      disabled={hardDeleteActivity.isPending}
                      className="h-8 px-2 text-rose-500 border-rose-200 hover:bg-rose-50"
                      title="영구 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
