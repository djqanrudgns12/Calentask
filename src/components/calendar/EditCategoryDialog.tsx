'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useUpdateCategory, useCategories } from '@/hooks/useCalendarQueries'
import { Check } from 'lucide-react'

const COLOR_SWATCHES = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // mint
  '#0ea5e9', // light blue
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#64748b', // slate
  '#78716c', // stone
  '#000000', // black
  '#475569'  // dark slate
]

export function EditCategoryDialog() {
  const { editingCategory, closeEditCategory } = useCalendarStore()
  const { mutate: updateCategory, isPending } = useUpdateCategory()
  const { data: categories = [] } = useCategories()

  const [name, setName] = useState('')
  const [hexColor, setHexColor] = useState('')

  useEffect(() => {
    if (editingCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editingCategory.name)
      setHexColor(editingCategory.hex_color || '#4f46e5')
    }
  }, [editingCategory])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCategory && name.trim()) {
      const isNameDuplicate = categories.some(c => c.id !== editingCategory.id && c.name === name.trim())
      if (isNameDuplicate) {
        alert('이미 존재하는 카테고리 이름입니다.')
        return
      }

      const isColorDuplicate = categories.some(c => c.id !== editingCategory.id && c.hex_color === hexColor)
      if (isColorDuplicate) {
        if (!window.confirm('기존 카테고리와 색상이 중복되었는데 이대로 수정할까요?')) {
          return
        }
      }

      updateCategory({
        id: editingCategory.id,
        name: name.trim(),
        hexColor
      }, {
        onSuccess: () => {
          closeEditCategory()
        }
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditCategory()
    }
  }

  return (
    <Dialog open={!!editingCategory} onOpenChange={handleOpenChange} modal>
      <DialogContent className="sm:max-w-[400px] bg-white border-none shadow-2xl rounded-2xl z-[300]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">카테고리 수정</DialogTitle>
          <DialogDescription className="sr-only">카테고리의 이름과 색상을 수정합니다.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-sm font-semibold text-gray-700">카테고리 이름</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="카테고리 이름을 입력하세요"
              className="border-gray-200 focus-visible:ring-indigo-500 rounded-lg bg-[#f8f9ff] h-11"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">색상 지정</Label>
            <div className="grid grid-cols-10 gap-2">
              {COLOR_SWATCHES.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setHexColor(color)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    hexColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {hexColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={closeEditCategory}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full px-5"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 shadow-sm shadow-indigo-200 transition-all active:scale-95"
            >
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
