'use client'

import { useMemo } from 'react'
import { NotebookPen, FileText, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useArchiveStore, BoardItem } from '@/store/useArchiveStore'
import { useCalendarStore } from '@/store/useCalendarStore'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export function RecentNotes() {
  const { tabs, items, setActiveTabId } = useArchiveStore()
  const { setViewMode } = useCalendarStore()

  // 모든 탭의 아이템을 수집하여 수정일 기준 내림차순 정렬
  const recentNotes = useMemo(() => {
    const allItems: (BoardItem & { tabName: string; tabId: string })[] = []

    for (const tab of tabs) {
      const tabItems = items[tab.id] || []
      for (const item of tabItems) {
        allItems.push({
          ...item,
          tabName: tab.name,
          tabId: tab.id,
        })
      }
    }

    return allItems
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3)
  }, [tabs, items])

  const handleNoteClick = (tabId: string) => {
    setActiveTabId(tabId)
    setViewMode('archive_notes')
  }

  const handleViewAll = () => {
    setViewMode('archive_notes')
  }

  // 컨텐츠 미리보기 정리 (HTML 태그 제거)
  const getPreview = (content: string | undefined) => {
    if (!content) return '내용 없음'
    // 단순 HTML 태그 제거 (React의 JSX 이스케이핑으로 안전)
    const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    return stripped || '내용 없음'
  }

  return (
    <div className="relative bg-card/85 backdrop-blur-xl rounded-3xl border border-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-inner border border-transparent/50">
            <NotebookPen className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">최근 노트</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {recentNotes.length > 0 ? '최근 수정한 노트' : '작성된 노트 없음'}
            </p>
          </div>
        </div>
        {recentNotes.length > 0 && (
          <button
            onClick={handleViewAll}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 노트 리스트 */}
      <div className="px-5 pb-5 space-y-2">
        {recentNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-amber-100/50">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">아직 작성한 노트가 없어요</p>
            <button
              onClick={handleViewAll}
              className="mt-3 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
            >
              노트 작성하러 가기
            </button>
          </div>
        ) : (
          recentNotes.map((note) => (
            <motion.button
              key={note.id}
              onClick={() => handleNoteClick(note.tabId)}
              whileHover={{ y: -1 }}
              className="w-full text-left p-3.5 rounded-2xl bg-muted/60 hover:bg-card border border-transparent hover:border-border/50 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06)] transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5 border border-amber-100/50">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                    {note.title || '무제'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {getPreview(note.content)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground/60">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ko })}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">•</span>
                    <span className="text-[10px] font-medium text-muted-foreground/60 line-clamp-1">
                      {note.tabName}
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}
