'use client'

import { Button } from '@/components/ui/button'
import { Trash2, RefreshCcw, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useDataHub } from '@/hooks/useDataHub'

export function TrashView() {
  const {
    deletedActivities,
    isLoading,
    handleRestore,
    isRestoring,
    handleHardDelete,
    isHardDeleting,
    handleEmptyTrash,
    isEmptyingTrash
  } = useDataHub()

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100">

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full">
          {/* 휴지통 관리 */}
          <section className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-800">보관된 항목 ({deletedActivities.length})</h3>
              </div>
              
              {deletedActivities.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleEmptyTrash}
                  disabled={isEmptyingTrash}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                >
                  {isEmptyingTrash ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  휴지통 비우기
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
                  <p className="text-slate-500 font-medium">데이터를 불러오는 중...</p>
                </div>
              ) : deletedActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-500 mb-1">휴지통이 비어있습니다.</p>
                  <p className="text-sm text-slate-400">삭제된 항목이 이곳에 안전하게 보관됩니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {deletedActivities.map(activity => (
                    <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-rose-200 hover:shadow-md transition-all group gap-4">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-base font-bold text-slate-800 truncate mb-1">{activity.title}</span>
                        <span className="text-sm font-medium text-slate-400 truncate flex items-center gap-1.5">
                          {format(new Date(activity.start_time), 'yyyy년 MM월 dd일 HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          onClick={() => handleRestore(activity.id)}
                          disabled={isRestoring}
                          className="flex-1 sm:flex-none h-10 px-4 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg font-semibold"
                        >
                          <RefreshCcw className="w-4 h-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">복구</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleHardDelete(activity.id)}
                          disabled={isHardDeleting}
                          className="flex-1 sm:flex-none h-10 px-4 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg font-semibold"
                        >
                          <Trash2 className="w-4 h-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">영구 삭제</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
