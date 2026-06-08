'use client'

/**
 * MobileCategoryBar — 모바일 전용 접이식 카테고리 필터 바
 * 
 * 왜 만들었는가: PC에서는 헤더 좌측에 GlobalCategoryFilter가 있지만,
 * 모바일에서는 공간 부족으로 숨겨져 있었음. 이 컴포넌트는 캘린더 그리드 바로 위에
 * 접을 수 있는 슬림 바 형태로 카테고리 필터 기능을 제공합니다.
 * 
 * 위치: 스크롤 컨테이너 내부 (헤더 외부) → 캘린더와 함께 스크롤됨
 * 토글 상태: useCalendarStore에 영속화 → 앱 재시작 후에도 유지
 */

import { useState } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useCategories } from '@/hooks/useCalendarQueries'
import { CategoryPopoverContent } from './GlobalCategoryFilter'
import { CategoryPresetMenu } from './CategoryPresetMenu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Folder, ChevronDown, ChevronUp, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function MobileCategoryBar() {
  const { 
    activeCategories, setActiveCategories, 
    isCategoryBarExpanded, setCategoryBarExpanded 
  } = useCalendarStore()
  const { data: categories = [] } = useCategories()
  const [popoverOpen, setPopoverOpen] = useState(false)

  // 활성 카테고리 객체 목록 (칩 렌더용)
  const activeCategoryObjects = categories.filter(cat => activeCategories.includes(cat.id))
  const activeCount = activeCategoryObjects.length

  // 카테고리 토글 (칩 × 버튼)
  const toggleCategory = (id: string) => {
    const newCats = activeCategories.includes(id)
      ? activeCategories.filter(c => c !== id)
      : [...activeCategories, id]
    setActiveCategories(newCats)
  }

  return (
    // 모바일 전용: md 이상에서는 숨김 (PC는 기존 GlobalCategoryFilter 사용)
    <div className="md:hidden px-2 pt-1 pb-0.5">
      <AnimatePresence initial={false}>
        {!isCategoryBarExpanded ? (
          /* ─── 접힌 상태: 작은 토글 버튼만 표시 ─── */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <button
              onClick={() => setCategoryBarExpanded(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 border border-slate-200/60 shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-slate-600">카테고리</span>
              {activeCount > 0 && (
                <div className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-extrabold">
                  {activeCount}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </motion.div>
        ) : (
          /* ─── 펼친 상태: 카테고리 팝오버 + 칩들 + 프리셋 + 접기 ─── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar touch-pan-x snap-x py-0.5">
              {/* 1. 카테고리 관리 팝오버 트리거 */}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/60 shadow-sm hover:shadow hover:border-indigo-200 transition-all shrink-0 active:scale-95 snap-start">
                  <Folder className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">카테고리</span>
                  {activeCount > 0 && (
                    <div className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-extrabold">
                      {activeCount}
                    </div>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 shadow-xl border-slate-100 rounded-2xl overflow-hidden" align="start" sideOffset={8}>
                  <CategoryPopoverContent />
                </PopoverContent>
              </Popover>

              {/* 2. 활성 카테고리 칩들 — 수평 스크롤 가능 */}
              {activeCategoryObjects.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1 pl-2 pr-1 py-1 bg-white rounded-lg shadow-sm border border-slate-100/80 hover:border-slate-200 transition-all shrink-0 snap-start"
                >
                  <div
                    className="w-2 h-2 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: cat.hex_color || '#4f46e5' }}
                  />
                  <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                    {cat.name}
                  </span>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* 3. 프리셋 메뉴 — 기존 컴포넌트 재사용 */}
              <div className="shrink-0 snap-start">
                <CategoryPresetMenu />
              </div>

              {/* 4. 접기 버튼 — 항상 우측 끝 */}
              <button
                onClick={() => setCategoryBarExpanded(false)}
                className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-colors shrink-0 snap-end active:scale-95"
                title="카테고리 바 접기"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
