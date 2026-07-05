'use client'

import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, MoreVertical, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useCategoryPresets, useCreateCategoryPreset, useUpdateCategoryPreset, useDeleteCategoryPreset } from '@/hooks/useCalendarQueries'
import type { CategoryPreset } from '@/app/actions/calendar'
import { cn } from '@/lib/utils'

export function CategoryPresetMenu() {
  const activeCategories = useCalendarStore(s => s.activeCategories)
  const activePresetId = useCalendarStore(s => s.activePresetId)
  const activePresetName = useCalendarStore(s => s.activePresetName)
  const setActivePreset = useCalendarStore(s => s.setActivePreset)
  const setActiveCategories = useCalendarStore(s => s.setActiveCategories)
  const { data: presets = [], isLoading } = useCategoryPresets()
  
  const { mutate: createPreset, isPending: isCreating } = useCreateCategoryPreset()
  const { mutate: updatePreset } = useUpdateCategoryPreset()
  const { mutate: deletePreset } = useDeleteCategoryPreset()

  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isPulsing, setIsPulsing] = useState(false)

  // 프리셋이 적용될 때 반짝이는 애니메이션 효과 트리거
  useEffect(() => {
    if (activePresetId) {
      setIsPulsing(true)
      const timer = setTimeout(() => setIsPulsing(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [activePresetId])

  const handleApplyPreset = (preset: CategoryPreset) => {
    setActiveCategories(preset.category_ids)
    setActivePreset(preset.id, preset.name)
    setIsOpen(false)
  }

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) {
      alert('프리셋 이름을 입력해주세요.')
      return
    }
    if (activeCategories.length === 0) {
      alert('현재 선택된 카테고리가 없습니다. 카테고리를 먼저 선택해주세요.')
      return
    }
    createPreset({ name: newPresetName.trim(), categoryIds: activeCategories }, {
      onSuccess: (newPreset) => {
        setIsAdding(false)
        setNewPresetName('')
        setActivePreset(newPreset.id, newPreset.name)
      }
    })
  }

  const handleStartEdit = (e: React.MouseEvent, preset: CategoryPreset) => {
    e.stopPropagation()
    setEditingId(preset.id)
    setEditingName(preset.name)
  }

  const handleSaveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!editingName.trim()) return
    updatePreset({ id, name: editingName.trim() }, {
      onSuccess: () => {
        setEditingId(null)
        if (activePresetId === id) {
          setActivePreset(id, editingName.trim())
        }
      }
    })
  }

  const handleDelete = (e: React.MouseEvent, preset: CategoryPreset) => {
    e.stopPropagation()
    if (window.confirm(`'${preset.name}' 프리셋을 삭제하시겠습니까?`)) {
      deletePreset(preset.id)
      if (activePresetId === preset.id) {
        setActivePreset(null, null)
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border border-transparent shadow-sm",
          activePresetId 
            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-200" 
            : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted ring-1 ring-border",
          isPulsing && "animate-pulse shadow-indigo-200 shadow-lg ring-2 ring-indigo-400"
        )}
      >
        <Star className={cn("w-4 h-4", activePresetId ? "fill-indigo-500 text-indigo-500" : "text-muted-foreground")} />
        <span>{activePresetName || '프리셋'}</span>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-2 rounded-xl shadow-lg border-border bg-card/95 backdrop-blur-md" align="start">
        <div className="px-2 py-1.5 mb-1 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">내 필터 프리셋</h4>
        </div>
        
        <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">로딩 중...</div>
          ) : presets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">저장된 프리셋이 없습니다.</div>
          ) : (
            presets.map(preset => (
              <div 
                key={preset.id} 
                className={cn(
                  "group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                  activePresetId === preset.id ? "bg-indigo-50" : "hover:bg-muted"
                )}
                onClick={() => handleApplyPreset(preset)}
              >
                {editingId === preset.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                    <Input 
                      autoFocus
                      value={editingName} 
                      onChange={e => setEditingName(e.target.value)}
                      className="h-7 text-sm px-2 w-full border-indigo-200 focus-visible:ring-indigo-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(e as any, preset.id)
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 shrink-0" onClick={(e) => handleSaveEdit(e, preset.id)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Star className={cn("w-3.5 h-3.5 shrink-0", activePresetId === preset.id ? "fill-indigo-500 text-indigo-500" : "text-muted-foreground/50")} />
                      <span className={cn("text-sm truncate", activePresetId === preset.id ? "font-semibold text-indigo-700" : "text-foreground")}>
                        {preset.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50" onClick={(e) => handleStartEdit(e, preset)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(e, preset)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-2 mt-1 border-t border-border">
          {isAdding ? (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Input 
                autoFocus
                placeholder="새 프리셋 이름..." 
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveCurrentAsPreset()
                  if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewPresetName('')
                  }
                }}
              />
              <Button size="sm" className="h-8 shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveCurrentAsPreset} disabled={isCreating}>
                저장
              </Button>
            </div>
          ) : (
            <button 
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-indigo-600 font-medium bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4" />
              현재 필터 상태 저장
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
