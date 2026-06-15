'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { useActivityTemplates, useDeleteTemplate } from '@/hooks/useInsightsQueries'
import { useCategories } from '@/hooks/useCalendarQueries'
import { TemplateFormDialog } from './TemplateFormDialog'
import type { ActivityTemplate } from '@/app/actions/insights'

interface TemplateManagementSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function TemplateManagementSheet({ isOpen, onClose }: TemplateManagementSheetProps) {
  const { data: templates = [], isLoading } = useActivityTemplates()
  const { data: categories = [] } = useCategories()
  const { mutate: deleteTemplate } = useDeleteTemplate()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null)

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setIsFormOpen(true)
  }

  const handleEdit = (template: ActivityTemplate) => {
    setEditingTemplate(template)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`'${title}' 템플릿을 삭제하시겠습니까?`)) {
      deleteTemplate(id)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background border-none shadow-2xl rounded-2xl flex flex-col h-[85vh] sm:h-[600px]">
          <DialogHeader className="px-6 py-5 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
            <DialogTitle className="text-xl font-bold text-foreground">템플릿 관리</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              자주 하는 일정을 템플릿으로 만들어두면 1초 만에 캘린더에 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : templates.length === 0 ? (
              <div 
                onClick={handleCreateNew}
                className="text-center py-12 px-4 bg-card rounded-xl border border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-indigo-900">템플릿이 없습니다</h3>
                <p className="text-xs text-muted-foreground group-hover:text-indigo-600">첫 번째 빠른 일정 템플릿을 추가해보세요.</p>
              </div>
            ) : (
              templates.map(template => {
                const templateCatIds = template.category_ids || (template.category_id ? [template.category_id] : [])
                const templateCats = templateCatIds.map(id => categories.find(c => c.id === id)).filter(Boolean)
                const hexColor = template.hex_color || templateCats[0]?.hex_color || '#4f46e5'

                return (
                  <div key={template.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hexColor }} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-foreground truncate">{template.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{templateCats.map(c => c?.name).join(', ') || '알 수 없음'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {template.duration_minutes}분</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleEdit(template)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(template.id, template.title)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-4 sm:p-6 bg-card border-t border-border mt-auto">
            <Button 
              onClick={handleCreateNew}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 shadow-sm shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" /> 새 템플릿 추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 템플릿 폼 다이얼로그 (생성/수정) */}
      <TemplateFormDialog 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        editingTemplate={editingTemplate}
      />
    </>
  )
}
