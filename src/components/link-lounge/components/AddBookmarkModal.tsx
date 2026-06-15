'use client'

import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Loader2, Image as ImageIcon, Tag, Type, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookmarkData {
  url: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
}

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BookmarkData) => void;
  initialData?: BookmarkData | null;
  existingTags: string[];
}

export function AddBookmarkModal({ isOpen, onClose, onSave, initialData, existingTags }: AddBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [tagInput, setTagInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setUrl(initialData.url || '');
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setImage(initialData.image || '');
        setTags(initialData.tags || []);
      } else {
        setUrl('');
        setTitle('');
        setDescription('');
        setImage('');
        setTags([]);
      }
      setError('');
      setTagInput('');
    }
  }, [isOpen, initialData]);

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
      // Don't show error to user, just let them manually input
    } finally {
      setIsFetching(false);
    }
  };

  const handleUrlBlur = () => {
    if (url && !title && !image) {
      fetchMetadata(url);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

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
      tags
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

                {/* Title and Tags */}
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

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-rose-500" /> 카테고리 태그
                    </label>
                    <div className="p-2 bg-muted border border-border rounded-xl focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all flex flex-wrap gap-2 items-center min-h-[50px]">
                      {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border text-foreground rounded-lg text-xs font-bold shadow-sm">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-rose-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder={tags.length === 0 ? "태그 입력 후 Enter" : ""}
                        className="flex-1 min-w-[100px] bg-transparent border-none focus:outline-none text-sm font-medium px-1 placeholder:text-muted-foreground"
                      />
                    </div>
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
