'use client'

import { useState, useMemo, useRef } from 'react';
import { useLinkLoungeStore, Bookmark } from '@/store/useLinkLoungeStore';
import { AddBookmarkModal } from './components/AddBookmarkModal';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { parseChromeBookmarks, downloadBookmarksFile, type ParsedBookmark } from '@/lib/chromeBookmarkUtils';
import { Plus, Search, ChevronDown, LayoutList, LayoutGrid, Maximize2, ExternalLink, Edit2, Trash2, Bookmark as BookmarkIcon, AlignLeft, FolderOpen, Upload, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function LinkLoungeView() {
  const { bookmarks, viewMode, setViewMode, addBookmark, updateBookmark, deleteBookmark, importBookmarks } = useLinkLoungeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Bookmark | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 가져오기/내보내기 상태
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [parsedBookmarks, setParsedBookmarks] = useState<ParsedBookmark[]>([]);
  
  // Focus mode specific state
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // 모든 고유 카테고리 추출 (폴더 개념)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [bookmarks]);

  const filteredItems = useMemo(() => {
    return bookmarks.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.url || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [bookmarks, searchQuery, selectedCategory]);

  const handleSaveBookmark = (data: any) => {
    if (editingItem) {
      updateBookmark(editingItem.id, {
        title: data.title,
        url: data.url,
        description: data.description,
        image: data.image,
        category: data.category
      });
    } else {
      addBookmark({
        title: data.title,
        url: data.url,
        description: data.description,
        image: data.image,
        category: data.category,
        icon: ''
      });
    }
  };

  const openEdit = (e: React.MouseEvent, item: Bookmark) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('정말 이 링크를 삭제하시겠습니까?')) {
      deleteBookmark(id);
      if (focusedItemId === id) setFocusedItemId(null);
    }
  };

  const handleOpenLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSetViewMode = (mode: 'lineup' | 'showcase' | 'focus') => {
    setViewMode(mode);
    setIsDropdownOpen(false);
  };

  // 기존 URL 집합 (중복 판별용)
  const existingUrls = useMemo(() => new Set(bookmarks.map(b => b.url)), [bookmarks]);

  // 크롬 북마크 HTML 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const html = ev.target?.result as string;
      const parsed = parseChromeBookmarks(html);
      setParsedBookmarks(parsed);
      setIsImportPreviewOpen(true);
    };
    reader.readAsText(file);

    // 같은 파일을 다시 선택해도 onChange가 발동하도록 초기화
    e.target.value = '';
  };

  // 미리보기에서 확인 → 선택된 항목을 스토어에 벌크 추가
  const handleImportConfirm = (selectedItems: ParsedBookmark[]) => {
    const itemsToImport = selectedItems.map(item => ({
      url: item.url,
      title: item.title,
      description: '',
      image: '',
      category: item.category,
      icon: item.icon,
    }));
    importBookmarks(itemsToImport);
  };

  // 내보내기 핸들러
  const handleExport = () => {
    if (bookmarks.length === 0) return;
    downloadBookmarksFile(bookmarks);
  };

  return (
    <div className="w-full h-full bg-background flex flex-col relative overflow-hidden rounded-tl-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-border/50">
      
      {/* Top Header */}
      <div className="px-4 py-4 md:px-8 md:py-6 bg-card/80 backdrop-blur-xl border-b border-border/60 z-20 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          
          {/* Search */}
          <div className="flex items-center gap-6 flex-1">
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="w-4 h-4 md:w-5 md:h-5 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="링크 검색..."
                className="w-full pl-9 md:pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Search (Icon only to expand, simplified here) */}
            <div className="sm:hidden">
              <button className="p-2.5 bg-muted border border-border rounded-xl text-foreground">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                {viewMode === 'lineup' && <LayoutList className="w-4 h-4 text-indigo-500" />}
                {viewMode === 'showcase' && <LayoutGrid className="w-4 h-4 text-purple-500" />}
                {viewMode === 'focus' && <Maximize2 className="w-4 h-4 text-rose-500" />}
                <span className="hidden lg:inline">
                  {viewMode === 'lineup' ? '라인업' : viewMode === 'showcase' ? '쇼케이스' : '포커스'}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-40 bg-card rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-border z-40 overflow-hidden py-2 p-1"
                    >
                      <button onClick={() => handleSetViewMode('lineup')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${viewMode === 'lineup' ? 'bg-indigo-50 text-indigo-700' : 'text-foreground hover:bg-muted'}`}>
                        <LayoutList className={`w-4 h-4 ${viewMode === 'lineup' ? 'text-indigo-600' : 'text-muted-foreground'}`} /> 라인업
                      </button>
                      <button onClick={() => handleSetViewMode('showcase')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${viewMode === 'showcase' ? 'bg-purple-50 text-purple-700' : 'text-foreground hover:bg-muted'}`}>
                        <LayoutGrid className={`w-4 h-4 ${viewMode === 'showcase' ? 'text-purple-600' : 'text-muted-foreground'}`} /> 쇼케이스
                      </button>
                      <button onClick={() => handleSetViewMode('focus')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${viewMode === 'focus' ? 'bg-rose-50 text-rose-700' : 'text-foreground hover:bg-muted'}`}>
                        <Maximize2 className={`w-4 h-4 ${viewMode === 'focus' ? 'text-rose-600' : 'text-muted-foreground'}`} /> 포커스
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all active:scale-95 text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 북마크</span>
            </button>

            {/* 북마크 가져오기 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-muted transition-colors text-sm whitespace-nowrap shadow-sm"
              title="크롬 북마크 가져오기"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              <span className="hidden lg:inline">가져오기</span>
            </button>

            {/* 북마크 내보내기 버튼 */}
            <button
              onClick={handleExport}
              disabled={bookmarks.length === 0}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-muted transition-colors text-sm whitespace-nowrap shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="크롬 북마크 내보내기"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span className="hidden lg:inline">내보내기</span>
            </button>

            {/* 숨겨진 파일 input — 가져오기 버튼 클릭 시 트리거 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* 카테고리 필터 필(Pill) 네비게이션 */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === null 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'bg-card text-foreground hover:bg-muted border border-border/60'
            }`}
          >
            전체 보기
          </button>
          {allCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-card text-foreground hover:bg-muted border border-border/60'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        {filteredItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-card shadow-sm border border-border rounded-3xl flex items-center justify-center mb-6">
              <BookmarkIcon className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground mb-2">저장된 링크가 없습니다</h3>
            <p className="text-muted-foreground font-medium text-center">우측 상단의 추가 버튼을 눌러 멋진 영감을 수집해보세요.</p>
          </div>
        ) : (
          <motion.div 
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-w-7xl mx-auto"
          >
            
            {/* VIEW MODE: LINEUP (List) */}
            {viewMode === 'lineup' && (
              <div className="flex flex-col gap-3">
                {filteredItems.map(item => (
                  <div key={item.id} onClick={(e) => handleOpenLink(e, item.url)} className="group flex items-stretch bg-card border border-border/60 rounded-2xl p-3 md:p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-200 transition-all cursor-pointer">
                    <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 bg-muted rounded-xl overflow-hidden border border-border">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : item.icon ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.icon} alt="" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><BookmarkIcon className="w-6 h-6 text-muted-foreground/50" /></div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-base md:text-lg font-extrabold text-foreground truncate">{item.title}</h3>
                        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => openEdit(e, item)} className="p-2 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate mb-1">{item.url}</p>
                      <p className="text-xs md:text-sm text-foreground font-medium truncate mb-2">{item.description}</p>
                      
                      {item.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground text-[10px] md:text-xs font-bold rounded-md">
                          <FolderOpen className="w-3 h-3" />{item.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE: SHOWCASE (Grid) */}
            {viewMode === 'showcase' && (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {filteredItems.map(item => (
                  <div key={item.id} onClick={(e) => handleOpenLink(e, item.url)} className="relative break-inside-avoid group bg-card border border-border/60 rounded-3xl p-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
                    <div className="w-full aspect-[4/3] bg-muted rounded-2xl overflow-hidden mb-4 relative">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : item.icon ? (
                        /* 커버 이미지가 없고 파비콘만 있을 때: 파비콘을 중앙에 크게 표시 */
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.icon} alt="" className="w-10 h-10 mb-2 drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          <span className="text-[10px] font-bold text-muted-foreground/60 truncate max-w-[80%]">{new URL(item.url).hostname.replace('www.','')}</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><BookmarkIcon className="w-10 h-10 text-muted-foreground/50" /></div>
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e) => openEdit(e, item)} className="p-2 bg-card/90 backdrop-blur shadow-sm text-foreground hover:text-indigo-600 rounded-full transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDelete(e, item.id)} className="p-2 bg-card/90 backdrop-blur shadow-sm text-foreground hover:text-rose-600 rounded-full transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    
                    <div className="px-1 flex-1 flex flex-col">
                      <h3 className="text-base font-extrabold text-foreground line-clamp-2 leading-snug mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium line-clamp-2 mb-3 flex-1">{item.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-border">
                        {item.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground text-[10px] font-bold rounded-lg border border-border/60">
                            <FolderOpen className="w-3 h-3" />{item.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE: FOCUS (Detail) */}
            {viewMode === 'focus' && (
              <div className="flex h-full gap-6 max-h-[80vh]">
                {/* Left Panel: List of items */}
                <div className="w-1/3 min-w-[280px] h-full overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setFocusedItemId(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                        focusedItemId === item.id 
                        ? 'bg-card border-indigo-200 shadow-md ring-1 ring-indigo-500/20' 
                        : 'bg-card/50 border-transparent hover:bg-card hover:shadow-sm'
                      }`}
                    >
                      <div className="w-12 h-12 shrink-0 bg-muted rounded-xl overflow-hidden">
                        {item.image ? (
                           // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : item.icon ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.icon} alt="" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><BookmarkIcon className="w-4 h-4 text-muted-foreground/50" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Panel: Focus Detail */}
                <div className="flex-1 h-full bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
                  {focusedItemId ? (
                    (() => {
                      const item = filteredItems.find(i => i.id === focusedItemId);
                      if (!item) return null;
                      return (
                        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                          {/* Big Image Cover */}
                          <div className="w-full h-64 md:h-80 bg-muted relative shrink-0">
                            {item.image ? (
                               // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            ) : item.icon ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.icon} alt="" className="w-16 h-16 mb-3 drop-shadow-lg" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                <span className="text-sm font-bold text-muted-foreground">{new URL(item.url).hostname.replace('www.','')}</span>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center">
                                <BookmarkIcon className="w-16 h-16 text-slate-200 mb-4" />
                                <span className="text-sm font-bold text-muted-foreground">썸네일 없음</span>
                              </div>
                            )}
                            
                            {/* Action overlay */}
                            <div className="absolute top-4 right-4 flex gap-2">
                              <button onClick={(e) => handleOpenLink(e, item.url)} className="px-4 py-2 bg-card/90 backdrop-blur-md rounded-xl text-sm font-bold text-foreground shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" /> 열기
                              </button>
                            </div>
                          </div>
                          
                          {/* Details */}
                          <div className="p-8 flex flex-col gap-6">
                            <div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.category && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                    <FolderOpen className="w-3.5 h-3.5" />{item.category}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">{item.title}</h2>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:text-indigo-600 hover:underline font-medium break-all">
                                {item.url}
                              </a>
                            </div>

                            <div className="p-6 bg-muted border border-border rounded-2xl">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4" /> 메모 / 설명
                              </h4>
                              <p className="text-foreground font-medium whitespace-pre-wrap leading-relaxed">
                                {item.description || '작성된 메모가 없습니다.'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                              <button onClick={(e) => openEdit(e, item)} className="flex-1 px-4 py-3 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                <Edit2 className="w-4 h-4" /> 수정하기
                              </button>
                              <button onClick={(e) => handleDelete(e, item.id)} className="flex-1 px-4 py-3 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted hover:text-rose-600 transition-colors flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> 삭제하기
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <LayoutGrid className="w-12 h-12 mb-4 opacity-50" />
                      <p className="font-medium text-sm">좌측 목록에서 항목을 선택하여 상세 내용을 확인하세요</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AddBookmarkModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveBookmark}
        initialData={editingItem}
        existingCategories={allCategories}
      />

      <ImportPreviewModal
        isOpen={isImportPreviewOpen}
        onClose={() => setIsImportPreviewOpen(false)}
        onConfirm={handleImportConfirm}
        parsedBookmarks={parsedBookmarks}
        existingUrls={existingUrls}
      />
    </div>
  );
}
