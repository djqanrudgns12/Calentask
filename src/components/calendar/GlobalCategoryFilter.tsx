'use client'

import { useState } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function GlobalCategoryFilter() {
  const { activeCategories, setActiveCategories } = useCalendarStore()
  const { data: categories = [] } = useCategories()
  const { mutate: createCategory } = useCreateCategory()
  const { mutate: deleteCategory } = useDeleteCategory()

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const toggleCategory = (id: string) => {
    const newCats = activeCategories.includes(id) 
      ? activeCategories.filter(c => c !== id) 
      : [...activeCategories, id]
    setActiveCategories(newCats)
  }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryName.trim()) {
      createCategory({ name: newCategoryName.trim(), hexColor: '#4f46e5' })
      setNewCategoryName('')
      setIsAddingCategory(false)
    }
  }

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteCategory(id)
    setActiveCategories(activeCategories.filter(c => c !== id))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 ml-4">
      <button
        type="button"
        onClick={() => setActiveCategories([])}
        className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all shadow-sm
          ${activeCategories.length === 0
            ? 'bg-white text-slate-900 border border-gray-200' 
            : 'bg-transparent text-gray-500 hover:bg-white/50 border border-transparent'
          }`}
      >
        전체
      </button>

      {categories.map(cat => {
        const isSelected = activeCategories.includes(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggleCategory(cat.id)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm
              ${isSelected 
                ? 'bg-[#4f46e5] text-white' 
                : 'bg-white/60 text-slate-600 hover:bg-white'
              }`}
          >
            {cat.name}
            {isSelected ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              !cat.is_default && (
                <div
                  className="hover:bg-red-200 p-0.5 rounded-full text-red-500 transition-colors"
                  onClick={(e) => handleDeleteCategory(e, cat.id)}
                >
                  <X className="w-3 h-3" />
                </div>
              )
            )}
          </button>
        )
      })}
      
      {isAddingCategory ? (
        <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-1 bg-white p-0.5 rounded-lg shadow-sm">
          <Input 
            autoFocus
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            className="w-24 h-8 text-sm border-none shadow-none focus-visible:ring-0 px-2 bg-transparent"
            placeholder="새 카테고리"
          />
          <Button type="submit" size="sm" className="h-7 rounded-md px-2 bg-indigo-600 text-white hover:bg-indigo-700">추가</Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-1 hover:bg-gray-100" onClick={() => setIsAddingCategory(false)}><X className="w-4 h-4 text-gray-500"/></Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCategory(true)}
          className="px-2 py-1.5 text-sm font-medium rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-white/50 transition-colors flex items-center justify-center shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
