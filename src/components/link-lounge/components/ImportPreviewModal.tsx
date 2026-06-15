'use client'

import { useState, useMemo, useEffect } from 'react';
import { X, FileUp, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Globe, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParsedBookmark } from '@/lib/chromeBookmarkUtils';

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: ParsedBookmark[]) => void;
  parsedBookmarks: ParsedBookmark[];
  existingUrls: Set<string>;  // 기존 북마크 URL 집합 (중복 판별용)
}

/**
 * 크롬 북마크 가져오기 미리보기 모달
 * - 카테고리별 아코디언으로 파싱된 북마크를 보여줌
 * - 중복 항목은 체크 비활성화 + 뱃지 표시
 * - 사용자가 체크박스로 선택적 가져오기 가능
 */
export function ImportPreviewModal({ isOpen, onClose, onConfirm, parsedBookmarks, existingUrls }: ImportPreviewModalProps) {
  // 카테고리별로 그룹화
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, ParsedBookmark[]>();
    parsedBookmarks.forEach(bm => {
      const cat = bm.category || '기타';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(bm);
    });
    return groups;
  }, [parsedBookmarks]);

  // 중복 여부 판별 함수 — URL 기준으로 비교
  const isDuplicate = (url: string) => existingUrls.has(url);

  // 각 항목별 체크 상태 — parsedBookmarks가 변경될 때마다 재초기화
  // (useState 초기화 함수는 최초 마운트 시 1회만 실행되므로 useEffect 필요)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // parsedBookmarks가 업데이트될 때 (파일 파싱 완료 시) 체크 상태를 초기화
  useEffect(() => {
    if (parsedBookmarks.length > 0) {
      // 비중복 항목을 모두 체크
      const initial = new Set<string>();
      parsedBookmarks.forEach(bm => {
        if (!existingUrls.has(bm.url)) initial.add(bm.url);
      });
      setCheckedItems(initial);
      // 모든 카테고리를 펼침 상태로 초기화하되, 기본은 접힘(빈 Set)
      setExpandedCategories(new Set());
    }
  }, [parsedBookmarks, existingUrls]);

  // 통계 계산
  const totalCount = parsedBookmarks.length;
  const duplicateCount = parsedBookmarks.filter(bm => isDuplicate(bm.url)).length;
  const selectedCount = checkedItems.size;

  // 카테고리 토글 (펼침/접힘)
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // 개별 항목 체크 토글
  const toggleItem = (url: string) => {
    if (isDuplicate(url)) return; // 중복 항목은 토글 불가
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  // 카테고리 일괄 선택/해제 — 해당 카테고리의 비중복 항목 전체를 토글
  const toggleCategoryAll = (cat: string) => {
    const items = groupedByCategory.get(cat) || [];
    const nonDuplicateUrls = items.filter(bm => !isDuplicate(bm.url)).map(bm => bm.url);
    
    // 현재 모두 체크되어 있으면 → 해제, 아니면 → 전부 체크
    const allChecked = nonDuplicateUrls.every(url => checkedItems.has(url));
    
    setCheckedItems(prev => {
      const next = new Set(prev);
      nonDuplicateUrls.forEach(url => {
        if (allChecked) next.delete(url);
        else next.add(url);
      });
      return next;
    });
  };

  // 확인 버튼 클릭 — 선택된 항목만 반환
  const handleConfirm = () => {
    const selected = parsedBookmarks.filter(bm => checkedItems.has(bm.url));
    onConfirm(selected);
    onClose();
  };

  // 카테고리 헤더의 체크 상태 계산
  const getCategoryCheckState = (cat: string): 'all' | 'some' | 'none' => {
    const items = groupedByCategory.get(cat) || [];
    const nonDuplicates = items.filter(bm => !isDuplicate(bm.url));
    if (nonDuplicates.length === 0) return 'none';
    const checkedCount = nonDuplicates.filter(bm => checkedItems.has(bm.url)).length;
    if (checkedCount === nonDuplicates.length) return 'all';
    if (checkedCount > 0) return 'some';
    return 'none';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card/95 backdrop-blur-xl border border-border/40 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* ① 요약 헤더 */}
            <div className="px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-indigo-500" />
                  크롬 북마크 가져오기
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 요약 통계 */}
              <div className="flex items-center gap-4 text-sm font-bold">
                <span className="text-foreground">전체 {totalCount}건</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 신규 {totalCount - duplicateCount}건
                </span>
                {duplicateCount > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 중복 {duplicateCount}건
                  </span>
                )}
              </div>
            </div>

            {/* ② 카테고리별 아코디언 리스트 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
              {Array.from(groupedByCategory.entries()).map(([category, items]) => {
                const isExpanded = expandedCategories.has(category);
                const checkState = getCategoryCheckState(category);
                const nonDupCount = items.filter(bm => !isDuplicate(bm.url)).length;
                const dupCount = items.length - nonDupCount;

                return (
                  <div key={category} className="mb-2">
                    {/* 카테고리 헤더 */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors">
                      {/* 카테고리 일괄 체크박스 */}
                      <button
                        onClick={() => toggleCategoryAll(category)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                          checkState === 'all' ? 'bg-indigo-600 border-indigo-600 text-white' :
                          checkState === 'some' ? 'bg-indigo-200 border-indigo-400 text-indigo-600' :
                          'border-border hover:border-indigo-400'
                        }`}
                      >
                        {checkState === 'all' && <span className="text-xs">✓</span>}
                        {checkState === 'some' && <span className="text-xs font-bold">−</span>}
                      </button>

                      {/* 폴더 아이콘 + 카테고리명 */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex-1 flex items-center gap-2 min-w-0"
                      >
                        <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-extrabold text-sm text-foreground truncate">{category}</span>
                        <span className="text-xs font-bold text-muted-foreground shrink-0">
                          ({nonDupCount}건{dupCount > 0 ? ` / 중복 ${dupCount}건` : ''})
                        </span>
                      </button>

                      {/* 펼침/접힘 */}
                      <button onClick={() => toggleCategory(category)} className="p-1 shrink-0">
                        {isExpanded 
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                      </button>
                    </div>

                    {/* 항목 리스트 */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 pr-2 pb-1 space-y-0.5">
                            {items.map((bm, idx) => {
                              const dup = isDuplicate(bm.url);
                              const checked = checkedItems.has(bm.url);

                              return (
                                <div
                                  key={`${bm.url}-${idx}`}
                                  onClick={() => toggleItem(bm.url)}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                    dup ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                                  }`}
                                >
                                  {/* 체크박스 */}
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                    dup ? 'border-border bg-muted' :
                                    checked ? 'bg-indigo-600 border-indigo-600 text-white' : 
                                    'border-border hover:border-indigo-400'
                                  }`}>
                                    {checked && !dup && <span className="text-[10px]">✓</span>}
                                  </div>

                                  {/* 파비콘 */}
                                  <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                    {bm.icon ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={bm.icon} alt="" className="w-4 h-4" />
                                    ) : (
                                      <Globe className="w-4 h-4 text-muted-foreground/50" />
                                    )}
                                  </div>

                                  {/* 제목 + URL */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${dup ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                      {bm.title}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {bm.url.replace(/^https?:\/\//, '').slice(0, 50)}
                                    </p>
                                  </div>

                                  {/* 상태 뱃지 */}
                                  {dup && (
                                    <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                      중복
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ③ 하단 액션 버튼 */}
            <div className="px-6 py-4 border-t border-border bg-muted/50 flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground font-medium">
                {selectedCount}개 항목이 선택됨
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-foreground hover:bg-slate-200/50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {selectedCount}건 가져오기
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
