'use client'

import { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon, Loader2, Image as ImageIcon, FolderOpen, Type, AlignLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 북마크 저장/수정 시 전달되는 데이터 구조
// tags 배열 → 단일 category 문자열로 전환 (폴더 개념)
interface BookmarkData {
  url: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BookmarkData) => void;
  initialData?: BookmarkData | null;
  existingCategories: string[];
}

export function AddBookmarkModal({ isOpen, onClose, onSave, initialData, existingCategories }: AddBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  // 단일 카테고리 (폴더 개념) — 다중 태그 대신 하나만 선택
  const [category, setCategory] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setUrl(initialData.url || '');
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setImage(initialData.image || '');
        setCategory(initialData.category || '');
        setCategoryInput(initialData.category || '');
      } else {
        setUrl('');
        setTitle('');
        setDescription('');
        setImage('');
        setCategory('');
        setCategoryInput('');
      }
      setError('');
      setShowCategoryDropdown(false);
    }
  }, [isOpen, initialData]);

  // 카테고리 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown]);

  const fetchMetadata = async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.startsWith('http')) return;
    
    setIsFetching(true);
    setError('');
    
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.image && !image) setImage(data.image);
    } catch (err) {
      console.error('Metadata fetch failed:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleUrlBlur = () => {
    if (url && !title && !image) {
      fetchMetadata(url);
    }
  };

  // 카테고리 선택: 기존 카테고리 클릭 시
  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setCategoryInput(cat);
    setShowCategoryDropdown(false);
  };

  // 카테고리 입력: 직접 타이핑하여 새 카테고리 생성 또는 기존 카테고리 검색
  const handleCategoryInputChange = (value: string) => {
    setCategoryInput(value);
    setCategory(value.trim());
    setShowCategoryDropdown(true);
  };

  // 입력값 기준으로 필터링된 기존 카테고리 목록
  const filteredCategories = existingCategories.filter(
    cat => cat.toLowerCase().includes(categoryInput.toLowerCase().trim())
  );

  const handleSave = () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }
    
    onSave({
      url: url.trim(),
      title: title.trim() || url,
      description: description.trim(),
      image: image.trim(),
      category: category.trim() || '기타'
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-transparent/40 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {initialData ? '링크 수정' : '새 링크 추가'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              
              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-indigo-500" /> URL 링크
                </label>
                <div className="relative">
                  <input 
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-foreground placeholder:text-muted-foreground"
                  />
                  {isFetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 flex items-center gap-2 text-xs font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline text-indigo-400">자동 추출 중...</span>
                    </div>
                  )}
                </div>
                {error && <p className="text-rose-500 text-xs font-bold mt-1 pl-1">{error}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Thumbnail Preview Area */}
                <div className="sm:col-span-1 flex flex-col space-y-1.5">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-purple-500" /> 썸네일
                  </label>
                  <div className="relative w-full aspect-square bg-muted border border-border rounded-xl overflow-hidden flex items-center justify-center group">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="Thumbnail preview" className="w-full h-full object-cover" onError={() => setImage('')} />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    )}
                    {/* Hover to clear/edit */}
                    {image && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button onClick={() => setImage('')} className="p-2 bg-card/20 hover:bg-card/40 rounded-full text-white backdrop-blur-md">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <input 
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="이미지 URL"
                    className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Title and Category */}
                <div className="sm:col-span-2 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-blue-500" /> 웹사이트 이름
                    </label>
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="사이트 제목을 입력하세요"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-foreground placeholder:font-medium"
                    />
                  </div>

                  {/* 단일 카테고리 선택 — 기존 다중 태그 칩 UI를 드롭다운+입력 콤보박스로 교체
                     - 기존 카테고리 목록에서 선택하거나, 직접 입력하여 새 카테고리 생성 가능
                     - 같은 이름의 카테고리가 이미 있으면 해당 카테고리에 자동 합류 */}
                  <div className="space-y-1.5" ref={categoryRef}>
                    <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-rose-500" /> 카테고리
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={categoryInput}
                        onChange={(e) => handleCategoryInputChange(e.target.value)}
                        onFocus={() => setShowCategoryDropdown(true)}
                        placeholder="카테고리 선택 또는 입력"
                        className="w-full px-4 py-3 pr-10 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-foreground placeholder:font-medium"
                      />
                      <ChevronDown 
                        className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      />

                      {/* 기존 카테고리 드롭다운 */}
                      <AnimatePresence>
                        {showCategoryDropdown && filteredCategories.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar py-1"
                          >
                            {filteredCategories.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => handleSelectCategory(cat)}
                                className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-2 ${
                                  category === cat 
                                    ? 'bg-rose-50 text-rose-700' 
                                    : 'text-foreground hover:bg-muted'
                                }`}
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                {cat}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {categoryInput.trim() && !existingCategories.includes(categoryInput.trim()) && (
                      <p className="text-xs text-emerald-600 font-bold pl-1">
                        💡 새 카테고리 &quot;{categoryInput.trim()}&quot; 가 생성됩니다
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description/Memo */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-emerald-500" /> 한 줄 평 / 메모
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 웹사이트의 특징이나 저장한 이유를 간단히 남겨주세요."
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground resize-none custom-scrollbar"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border bg-muted/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-foreground hover:bg-slate-200/50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all active:scale-95"
              >
                {initialData ? '저장하기' : '추가하기'}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
