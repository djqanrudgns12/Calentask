'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Tag as TagIcon, Loader2, Pencil } from 'lucide-react'
import { useTagsManagement, COLORS } from '@/hooks/useTagsManagement'
import { useCalendarStore } from '@/store/useCalendarStore'

export function TagsView() {
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
    <div className="flex flex-col h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100">

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
          {/* 새 태그 생성 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">새 태그 만들기</h3>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex gap-3">
                <Input 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="태그 이름을 입력하세요 (예: 사이드프로젝트)"
                  className="bg-slate-50 border-slate-200 focus-visible:ring-teal-500 flex-1 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <Button 
                  onClick={handleCreate}
                  disabled={isCreating || !newCatName.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  추가
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCatColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform shrink-0 ${
                      newCatColor === color ? 'ring-2 ring-offset-2 ring-teal-600 scale-110' : 'hover:scale-110'
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
              <h3 className="text-lg font-bold text-slate-800">생성된 태그 관리</h3>
              <span className="text-sm text-slate-500 font-medium">총 {categories?.length || 0}개의 태그</span>
            </div>

            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const usageCount = getUsageCount(cat.id)

                  return (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: cat.hex_color }} 
                        />
                        <span className="font-bold text-base text-slate-700">{cat.name}</span>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {usageCount}개의 일정
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                <TagIcon className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">생성된 태그가 없습니다.</p>
                <p className="text-sm text-slate-400 mt-1">위에서 새로운 태그를 추가해보세요.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
