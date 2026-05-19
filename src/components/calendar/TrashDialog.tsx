'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, RefreshCcw } from 'lucide-react'
import { useDeletedActivities, useRestoreActivity } from '@/hooks/useCalendarQueries'
import { format } from 'date-fns'

export function TrashDialog() {
  const [open, setOpen] = useState(false)
  
  const { data: deletedActivities = [], isLoading } = useDeletedActivities()
  const { mutate: restoreActivity, isPending } = useRestoreActivity()

  const handleRestore = (id: string) => {
    restoreActivity(id)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error DialogTrigger asChild typing issue */}
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 mt-4">
          <Trash2 className="w-4 h-4 mr-2" />
          휴지통
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>휴지통</DialogTitle>
        </DialogHeader>
        <div className="pt-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-center text-gray-500 py-4">불러오는 중...</p>
          ) : deletedActivities.length === 0 ? (
            <p className="text-sm text-center text-gray-500 py-4">휴지통이 비어있습니다.</p>
          ) : (
            <div className="space-y-3">
              {deletedActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="text-sm font-semibold text-gray-800 truncate">{activity.title}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {format(new Date(activity.start_time), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRestore(activity.id)}
                    disabled={isPending}
                    className="flex-shrink-0"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                    복구
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
