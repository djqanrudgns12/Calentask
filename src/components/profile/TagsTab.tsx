'use client'

import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useActivities } from '@/hooks/useCalendarQueries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Tag as TagIcon, Loader2 } from 'lucide-react'

const COLORS = ['#F43F5E', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#64748B']

export function TagsTab() {
  const { data: categories, isLoading: isCategoriesLoading } = useCategories()
  // 모든 일정을 불러와서 카테고리별 사용량 계산용 (실제로는 서버 통계 API가 더 좋으나 프론트엔드 캐시 활용)
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

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto py-4">
      {/* 새 태그 생성 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">새 태그 만들기</h3>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex gap-3">
            <Input 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="태그 이름을 입력하세요 (예: 사이드프로젝트)"
              className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button 
              onClick={handleCreate}
              disabled={createCategory.isPending || !newCatName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createCategory.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              추가
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewCatColor(color)}
                className={`w-8 h-8 rounded-full transition-transform ${
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
          <h3 className="text-lg font-bold text-slate-800">생성된 태그 관리</h3>
          <span className="text-sm text-slate-500 font-medium">총 {categories?.length || 0}개의 태그</span>
        </div>

        {isCategoriesLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {categories.map((cat) => {
              // 카테고리 사용량 계산
              const usageCount = allActivities?.filter(a => a.categories?.some(c => c.id === cat.id)).length || 0

              return (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: cat.hex_color }} 
                    />
                    <span className="font-semibold text-slate-700">{cat.name}</span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {usageCount}개의 일정
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (confirm(`'${cat.name}' 태그를 삭제하시겠습니까? 이 태그가 지정된 일정에서 태그가 해제됩니다.`)) {
                        deleteCategory.mutate(cat.id)
                      }
                    }}
                    disabled={deleteCategory.isPending}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
  )
}
