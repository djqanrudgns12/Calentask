'use client'

import { useState } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { Plus, Pencil, Trash2, Folder, Check, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from '@/components/ui/popover'

export function GlobalCategoryFilter() {
  const { activeCategories, setActiveCategories, openEditCategory } = useCalendarStore()
  const { data: categories = [] } = useCategories()
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory()
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory()

  const [open, setOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  // 로컬 호버 상태로 렌더링 덜 지저분하게 관리
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const toggleCategory = (id: string) => {
    const newCats = activeCategories.includes(id) 
      ? activeCategories.filter(c => c !== id) 
      : [...activeCategories, id]
    setActiveCategories(newCats)
  }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryName.trim() && !isCreating) {
      createCategory({ name: newCategoryName.trim(), hexColor: '#4f46e5' }, {
        onSuccess: () => {
          setNewCategoryName('')
        }
      })
    }
  }

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (isDeleting) return
    setDeletingId(id)
    deleteCategory(id, {
      onSuccess: () => {
        setActiveCategories(activeCategories.filter(c => c !== id))
        setDeletingId(null)
      },
      onError: () => setDeletingId(null)
    })
  }

  const activeCategoryObjects = categories.filter(cat => activeCategories.includes(cat.id))
  
  // 최대 3개의 색상 도트 표시용 (나머지는 숫자로 요약)
  const displayDots = activeCategoryObjects.slice(0, 3)
  const remainingCount = activeCategoryObjects.length - displayDots.length

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100/60 p-1.5 rounded-[1.25rem] shadow-inner transition-all max-w-[280px] sm:max-w-[360px] lg:max-w-[450px] xl:max-w-[500px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="group flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 rounded-xl bg-white shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer outline-none shrink-0 h-9">
          <Folder className="w-4 h-4 text-indigo-500/80 group-hover:text-indigo-600 transition-colors" />
          <span className="text-sm font-bold text-slate-700 hidden sm:block">카테고리</span>
        {activeCategoryObjects.length > 0 && (
          <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 ml-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-extrabold tracking-tight">
            {activeCategoryObjects.length}
          </div>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 shadow-xl border-slate-100 rounded-2xl overflow-hidden" align="start" sideOffset={8}>
        <PopoverHeader className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
          <PopoverTitle className="flex items-center text-slate-800 font-bold">
            <Folder className="w-4 h-4 mr-1.5 text-indigo-500" />
            카테고리 관리
          </PopoverTitle>
          {/* 전체 선택/해제 토글 버튼: 모든 카테고리가 선택되면 "전체 해제", 아니면 "전체 선택" 표시 */}
          {categories.length > 0 && (
            activeCategories.length === categories.length ? (
              <button 
                onClick={() => setActiveCategories([])}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                전체 해제
              </button>
            ) : (
              <button 
                onClick={() => setActiveCategories(categories.map(c => c.id))}
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                전체 선택
              </button>
            )
          )}
        </PopoverHeader>

        {/* Scrollable Category List */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 hide-scrollbar">
          {categories.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              생성된 카테고리가 없습니다.
            </div>
          ) : (
            categories.map(cat => {
              const isSelected = activeCategories.includes(cat.id)
              const isCatDeleting = deletingId === cat.id

              return (
                <div 
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors
                    ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox indicator */}
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0
                      ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}
                    `}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    
                    {/* Color dot & Name */}
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: cat.hex_color || '#4f46e5' }} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                        {cat.name}
                      </span>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditCategory(cat); setOpen(false); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm transition-all"
                      title="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!cat.is_default && (
                      <button
                        onClick={(e) => handleDeleteCategory(e, cat.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md shadow-sm transition-all disabled:opacity-50"
                        title="삭제"
                      >
                        {isCatDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Bottom Quick Add */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Plus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="새 카테고리 추가..."
                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                disabled={isCreating}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!newCategoryName.trim() || isCreating}
              className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : '추가'}
            </Button>
          </form>
        </div>
      </PopoverContent>
      </Popover>

      {/* Selected Categories */}
      {activeCategoryObjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-l border-slate-200/60 pl-2 py-0.5">
          {activeCategoryObjects.map(cat => (
            <div 
              key={cat.id} 
              className="group/tag flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white rounded-lg shadow-sm border border-slate-100/80 hover:border-slate-200 hover:shadow transition-all"
            >
              <div 
                className="w-2 h-2 rounded-full shadow-sm shrink-0" 
                style={{ backgroundColor: cat.hex_color || '#4f46e5' }} 
              />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {cat.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCategory(cat.id)
                }}
                className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
