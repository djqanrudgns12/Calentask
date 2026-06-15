'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Tag as TagIcon, Loader2, Pencil } from 'lucide-react'
import { useTagsManagement, COLORS } from '@/hooks/useTagsManagement'
import { useCalendarStore } from '@/store/useCalendarStore'
import { SmartInsightWidget } from './components/SmartInsightWidget'
import { CategoryDetailPanel } from './components/CategoryDetailPanel'

export function TagsView() {
  const {
    categories,
    isCategoriesLoading,
    allActivities,
    newCatName,
    setNewCatName,
    newCatColor,
    setNewCatColor,
    handleCreate,
    isCreating,
    handleDelete,
    isDeleting,
    getUsageCount,
    getTotalUsageCount
  } = useTagsManagement()

  const { openEditCategory } = useCalendarStore()
  
  // 선택된 카테고리 ID (우측 상세 패널용)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId) || null

  return (
    <div className="flex flex-col h-full bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {/* 상단 스마트 인사이트 위젯 */}
        <SmartInsightWidget categories={categories || null} getUsageCount={getUsageCount} />

        <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1600px] mx-auto h-[calc(100%-100px)]">
          
          {/* 좌측: 생성 폼 및 목록 */}
          <div className="flex-1 flex flex-col gap-8 min-w-0">
            {/* 새 카테고리 생성 */}
            <section className="space-y-4 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">새 카테고리 만들기</h3>
              <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-4">
                <div className="flex gap-3">
                  <Input 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="카테고리 이름을 입력하세요 (예: 사이드프로젝트)"
                    className="bg-muted border-border focus-visible:ring-teal-500 flex-1 rounded-xl"
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

            {/* 카테고리 목록 */}
            <section className="space-y-4 flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-slate-800">생성된 카테고리 관리</h3>
              </div>

              {isCategoriesLoading ? (
                <div className="flex-1 flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
              ) : categories && categories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max overflow-y-auto pr-2 hide-scrollbar pb-10">
                  {categories.map((cat) => {
                    const usageCount = getUsageCount(cat.id)
                    const totalUsage = getTotalUsageCount()
                    const sharePercent = totalUsage > 0 ? Math.round((usageCount / totalUsage) * 100) : 0
                    const isSelected = selectedCategoryId === cat.id

                    return (
                      <div 
                        key={cat.id} 
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex flex-col justify-between p-4 bg-card rounded-2xl shadow-sm border transition-all cursor-pointer group relative overflow-hidden ${
                          isSelected 
                          ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20' 
                          : 'border-border hover:border-slate-300 hover:shadow-md'
                        }`}
                        style={{
                          // Phase 2: Dynamic Gradient Tint
                          background: isSelected ? `linear-gradient(135deg, ${cat.hex_color}15 0%, transparent 100%)` : undefined
                        }}
                      >
                        {/* Hover/Selected Glow */}
                        <div 
                          className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none ${isSelected ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'}`}
                          style={{ backgroundColor: cat.hex_color }}
                        />

                        <div className="flex items-center justify-between relative z-10 mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-4 h-4 rounded-full shadow-sm transition-transform ${isSelected ? 'scale-110' : ''}`} 
                              style={{ backgroundColor: cat.hex_color }} 
                            />
                            <span className={`font-bold text-base transition-colors ${isSelected ? 'text-indigo-950' : 'text-foreground'}`}>
                              {cat.name}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground'}`}>
                              {usageCount}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                              className="p-2 text-muted-foreground hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name); }}
                              disabled={isDeleting}
                              className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative z-10 w-full flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${sharePercent}%`, backgroundColor: cat.hex_color }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{sharePercent}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border border-dashed">
                  <TagIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-slate-500">생성된 카테고리가 없습니다.</p>
                  <p className="text-sm text-slate-400 mt-1">위에서 새로운 카테고리를 추가해보세요.</p>
                </div>
              )}
            </section>
          </div>

          {/* 우측: 카테고리 상세 뷰 (Split View Panel) */}
          <div className="w-full xl:w-[450px] shrink-0 xl:h-full min-h-[500px]">
            <CategoryDetailPanel 
              category={selectedCategory} 
              usageCount={selectedCategory ? getUsageCount(selectedCategory.id) : 0} 
              activities={allActivities?.filter(a => a.categories?.some(c => c.id === selectedCategory?.id)) || []}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
