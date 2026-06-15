'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark as BookmarkIcon, ExternalLink, ArrowRight, Link, Copy, Check, FolderOpen } from 'lucide-react'
import { useLinkLoungeStore } from '@/store/useLinkLoungeStore'
import { useCalendarStore } from '@/store/useCalendarStore'

export function LinkLoungeCard() {
  const { bookmarks } = useLinkLoungeStore()
  const { setViewMode } = useCalendarStore()
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 추출된 모든 고유 카테고리들 (폴더 개념)
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    bookmarks.forEach(bm => {
      if (bm.category) cats.add(bm.category)
    })
    return ['전체', ...Array.from(cats)]
  }, [bookmarks])

  // 필터링 및 정렬된 북마크
  const displayedBookmarks = useMemo(() => {
    let filtered = bookmarks
    if (selectedCategory !== '전체') {
      filtered = bookmarks.filter(bm => bm.category === selectedCategory)
    }
    // 최신순 정렬
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [bookmarks, selectedCategory])

  const handleCopyUrl = async (e: React.MouseEvent, id: string, url: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative bg-card/85 backdrop-blur-xl rounded-3xl border border-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center shadow-inner border border-transparent/50">
              <BookmarkIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight">링크 라운지</h2>
              <p className="text-xs text-muted-foreground font-medium">
                {bookmarks.length > 0 ? `총 ${bookmarks.length}개의 링크` : '저장된 링크 없음'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('link_lounge')}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 카테고리 필터 영역 */}
        {allCategories.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-muted/80 text-muted-foreground hover:bg-accent/80'
                }`}
              >
                {cat !== '전체' && <FolderOpen className="w-3 h-3" />}
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 리스트 영역 */}
      <div className="px-4 pb-5 flex-1 overflow-y-auto hide-scrollbar max-h-[320px]">
        {displayedBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-emerald-100/50">
              <Link className="w-5 h-5 text-emerald-300" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">
                {selectedCategory === '전체' ? '아직 저장된 링크가 없어요' : '해당 카테고리의 링크가 없어요'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-1.5">
              {displayedBookmarks.map(bm => (
                <motion.div
                  key={bm.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenLink(bm.url)}
                  className="group relative flex items-center gap-3 p-3 rounded-2xl bg-muted/60 hover:bg-card border border-transparent hover:border-emerald-100/50 hover:shadow-[0_4px_16px_-6px_rgba(16,185,129,0.12)] transition-all cursor-pointer overflow-hidden hover:-translate-y-[1px]"
                >
                  {/* 왼쪽 파비콘/아이콘 */}
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center overflow-hidden">
                    {bm.image ? (
                      <img src={bm.image} alt="" className="w-6 h-6 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <Link className="w-4 h-4 text-muted-foreground/60" />
                    )}
                  </div>

                  {/* 중앙 텍스트 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-extrabold text-foreground truncate group-hover:text-emerald-700 transition-colors">
                      {bm.title || bm.url}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                      {bm.url.replace(/^https?:\/\//, '')}
                    </p>
                  </div>

                  {/* 호버 시 액션 버튼들 & 평상시 카테고리 */}
                  <div className="flex items-center shrink-0">
                    <div className="flex gap-1.5 opacity-100 group-hover:hidden pr-1 transition-all">
                      {bm.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                          <FolderOpen className="w-3 h-3" />
                          {bm.category}
                        </span>
                      )}
                    </div>

                    <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200 pr-1">
                      <button
                        onClick={(e) => handleCopyUrl(e, bm.id, bm.url)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="URL 복사"
                      >
                        {copiedId === bm.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenLink(bm.url); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="새 창으로 열기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
