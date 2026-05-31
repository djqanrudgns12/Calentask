'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Tag as TagIcon, Loader2, X, Pencil } from 'lucide-react'
import { useTagsManagement, COLORS } from '@/hooks/useTagsManagement'
import { useCalendarStore } from '@/store/useCalendarStore'

interface TagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagsModal({ open, onOpenChange }: TagsModalProps) {
  const {
    categories,
    isCategoriesLoading,
    newCatName,
    setNewCatName,
    newCatColor,
    setNewCatColor,
    handleCreate,
    isCreating,
    handleDelete,
    isDeleting,
    getUsageCount
  } = useTagsManagement()

  const { openEditCategory } = useCalendarStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-white flex flex-row items-center justify-between z-10 shadow-sm relative">
          <DialogTitle className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-indigo-500" />
            태그 관리소
          </DialogTitle>
          <DialogDescription className="sr-only">태그를 관리합니다.</DialogDescription>
          <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 md:gap-8 w-full max-w-2xl mx-auto">
            {/* 새 태그 생성 */}
            <section className="space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800">새 태그 만들기</h3>
              <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 space-y-3 md:space-y-4">
                <div className="flex gap-2 md:gap-3">
                  <Input 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="태그 이름을 입력하세요 (예: 사이드프로젝트)"
                    className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 flex-1 rounded-xl"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <Button 
                    onClick={handleCreate}
                    disabled={isCreating || !newCatName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    추가
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCatColor(color)}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-full transition-transform shrink-0 ${
                        newCatColor === color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 태그 목록 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-slate-800">생성된 태그 관리</h3>
                <span className="text-xs md:text-sm text-slate-500 font-medium">총 {categories?.length || 0}개의 태그</span>
              </div>

              {isCategoriesLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
              ) : categories && categories.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {categories.map((cat) => {
                    const usageCount = getUsageCount(cat.id)

                    return (
                      <div key={cat.id} className="flex items-center justify-between p-3 md:p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div 
                            className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full shadow-sm" 
                            style={{ backgroundColor: cat.hex_color }} 
                          />
                          <span className="font-semibold text-[13px] md:text-base text-slate-700">{cat.name}</span>
                          <span className="text-[10px] md:text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {usageCount}개의 일정
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            disabled={isDeleting}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                  <TagIcon className="w-10 h-10 mb-3 text-slate-300" />
                  <p>생성된 태그가 없습니다.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
