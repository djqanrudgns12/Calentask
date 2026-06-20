'use client'

import { useState, useEffect, useRef } from 'react';
import { Plus, Video, Play, X, Clock, Tag as TagIcon, LayoutGrid, List as ListIcon, Link as LinkIcon, Palette, Edit2 } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FastAverageColor } from 'fast-average-color';

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const ytRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/(?:shorts|live)\/)([^"&?\/\s]{11})/i;
  const match = url.match(ytRegExp);
  if (match && match[1].length === 11) {
    return match[1];
  }
  return null;
}

// Extracts a thumbnail and standardizes URL if possible
function extractMediaMetadata(url: string) {
  let thumbnail = '';
  const videoId = extractYouTubeId(url);
  
  if (videoId) {
    thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  
  return { thumbnail, url };
}

// Inline YouTube player component using direct iframe embed
function YouTubePlayer({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  
  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/50">
        <p>유효하지 않은 YouTube URL입니다</p>
      </div>
    );
  }
  
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      style={{ border: 'none' }}
    />
  );
}

const EMPTY_ARRAY: any[] = [];

export function MediaBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  
  const [viewMode, setViewMode] = useState<'masonry' | 'list'>('masonry');
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId || !newUrl.trim()) return;

    const { thumbnail, url } = extractMediaMetadata(newUrl);
    let dominantColor = '#f8fafc'; // default neutral

    if (thumbnail) {
      try {
        const fac = new FastAverageColor();
        const color = await fac.getColorAsync(thumbnail, { crossOrigin: 'anonymous' });
        dominantColor = color.hex;
      } catch (err) {
        console.warn('CORS or loading error for average color, using default.', err);
      }
    }

    addItem(activeTabId, {
      title: newTitle.trim() || '새로운 미디어/링크',
      data: {
        url,
        thumbnail,
        color: dominantColor
      }
    });

    setNewUrl('');
    setNewTitle('');
    setIsAdding(false);
  };

  const handleEditMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId || !editingCardId || !editUrl.trim()) return;

    const { thumbnail, url } = extractMediaMetadata(editUrl);
    let dominantColor = '#f8fafc'; // default neutral

    if (thumbnail) {
      try {
        const fac = new FastAverageColor();
        const color = await fac.getColorAsync(thumbnail, { crossOrigin: 'anonymous' });
        dominantColor = color.hex;
      } catch (err) {
        console.warn('CORS or loading error for average color, using default.', err);
      }
    }

    updateItem(activeTabId, editingCardId, {
      title: editTitle.trim() || '새로운 미디어/링크',
      data: {
        url,
        thumbnail,
        color: dominantColor
      }
    });

    setEditingCardId(null);
  };

  const activeMedia = items.find(i => i.id === activeMediaId);

  return (
    <div className="w-full h-full bg-background p-6 md:p-10 overflow-y-auto hide-scrollbar relative">
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex bg-card rounded-xl shadow-sm border border-border p-1">
            <button 
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'masonry' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-sm hover:bg-rose-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            미디어 추가
          </button>
        </div>

        {/* Add Media Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              onSubmit={handleAddMedia}
              className="bg-card p-6 rounded-3xl shadow-md border border-border mb-8 flex flex-col md:flex-row gap-4 items-end overflow-hidden"
            >
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                   <LinkIcon className="w-4 h-4 text-rose-500" />
                   미디어 URL (유튜브, 비메오, 사운드클라우드 등)
                </label>
                <input 
                  autoFocus
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-foreground"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-foreground mb-2">제목 (선택)</label>
                <input 
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="직접 입력하지 않으면 자동 저장됩니다"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-foreground"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button 
                  type="submit"
                  disabled={!newUrl.trim()}
                  className="flex-1 md:flex-none px-6 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-all h-[50px]"
                >
                  저장
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 md:flex-none px-4 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-colors h-[50px]"
                >
                  취소
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Media Gallery */}
        {items.length === 0 && !isAdding ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner rotate-3">
              <Video className="w-10 h-10 text-rose-500 -rotate-3" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">영감을 수집할 준비가 되셨나요?</h3>
            <p className="text-slate-500 font-medium max-w-sm text-center">유튜브 비디오, 사운드클라우드 음악 등 모든 미디어를 여기에 기록하고 노트와 태그를 남기세요.</p>
          </div>
        ) : (
          <div className={`${
              viewMode === 'masonry' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'flex flex-col gap-4'
            }`}
          >
            {items.map(item => (
              <motion.div 
                layoutId={`media-${item.id}`}
                key={item.id} 
                className={`bg-card rounded-3xl shadow-sm border border-border overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer break-inside-avoid ${viewMode === 'list' ? 'flex' : ''}`}
                onClick={() => setActiveMediaId(item.id)}
              >
                {/* Thumbnail */}
                {/* 왜: 모바일 리스트 뷰에서 썸네일 폭을 좁게하여 텍스트 영역 확보 */}
                <div 
                  className={`relative ${viewMode === 'masonry' ? 'w-full' : 'w-32 md:w-64 shrink-0 aspect-video'}`}
                  style={{ backgroundColor: item.data?.color || '#0f172a' }}
                >
                  {item.data?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={item.data.thumbnail} 
                      alt={item.title} 
                      className={`w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity ${viewMode === 'masonry' ? 'aspect-auto min-h-[160px]' : ''}`} 
                      onError={(e) => {
                        if (e.currentTarget.src.includes('maxresdefault.jpg')) {
                          e.currentTarget.src = item.data.thumbnail.replace('maxresdefault.jpg', 'hqdefault.jpg');
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full aspect-video flex items-center justify-center">
                      <LinkIcon className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 bg-card/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all border border-transparent/30">
                      <Play className="w-6 h-6 text-white ml-1 shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                {/* 왜: 모바일 리스트 뷰에서 불필요한 패딩을 줄여 제목 길이 확보 */}
                <div className="p-3 md:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      {/* 왜: 글자 크기를 조금 줄이고 자동 줄바꿈 처리하여 아주 긴 글자도 잘림 방지 */}
                      <h3 className="font-bold text-foreground text-base md:text-lg leading-snug line-clamp-2 break-all sm:break-words">{item.title}</h3>
                      {/* 왜: 모바일 환경(터치기기)에서는 hover를 사용할 수 없으므로 항시 노출시키고, PC에서는 hover시에만 나타나도록 처리 */}
                      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingCardId(item.id); setEditTitle(item.title); setEditUrl((item.data?.url as string) || ''); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(activeTabId!, item.id); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.content && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3 font-medium leading-relaxed">{item.content}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-5 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md"><Clock className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.tags && item.tags.length > 0 && (
                      <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md"><TagIcon className="w-3 h-3" /> {item.tags.length}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Viewer Modal (React Player & Note Taking) */}
      <AnimatePresence>
        {activeMedia && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-lg"
              onClick={() => setActiveMediaId(null)}
            />
            {/* 왜: 모바일 브라우저 주소창 등에 의해 모달 하단이 잘리는 현상 방지 */}
            <motion.div 
              layoutId={`media-${activeMedia.id}`}
              className="relative w-full max-w-6xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85dvh] md:max-h-[90vh]"
            >
              {/* YouTube Player Wrapper */}
              <div className="w-full md:w-2/3 bg-black relative flex flex-col justify-center min-h-[30vh]">
                <button 
                  onClick={() => setActiveMediaId(null)}
                  className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-full aspect-video relative bg-black">
                  <YouTubePlayer url={activeMedia.data?.url as string} />
                </div>
              </div>

              {/* Note Taking Area */}
              <div className="w-full md:w-1/3 bg-card flex flex-col h-[50vh] md:h-auto border-l border-border">
                <div className="p-6 border-b border-border flex items-start justify-between bg-muted/50" style={{ borderTop: `4px solid ${activeMedia.data?.color || '#4f46e5'}` }}>
                  <input 
                    type="text"
                    value={activeMedia.title}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { title: e.target.value })}
                    className="font-black text-xl text-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                    placeholder="제목 없는 미디어"
                  />
                  <button onClick={() => setActiveMediaId(null)} className="hidden md:flex p-1.5 hover:bg-slate-200 rounded-xl text-muted-foreground transition-colors ml-4">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> 타임스탬프 북마크
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">영상 시청 중 인상 깊은 순간의 시간(예: 1:23)과 함께 기록을 남겨보세요.</p>
                  
                  <textarea 
                    value={activeMedia.content || ''}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { content: e.target.value })}
                    placeholder="[12:34] 핵심 인사이트 메모..."
                    className="flex-1 w-full bg-muted/50 border border-border rounded-2xl p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                  />
                  
                  <div className="mt-auto pt-4 border-t border-border">
                    <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                       <TagIcon className="w-3.5 h-3.5" /> 태그 (쉼표로 구분)
                    </label>
                    <input 
                      type="text"
                      value={activeMedia.tags?.join(', ') || ''}
                      onChange={(e) => updateItem(activeTabId!, activeMedia.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="디자인, 영감, 튜토리얼..."
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Media Modal */}
      <AnimatePresence>
        {editingCardId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setEditingCardId(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-card rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-lg text-foreground">미디어 수정</h3>
                <button onClick={() => setEditingCardId(null)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditMedia} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">미디어 URL</label>
                  <input 
                    autoFocus
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">제목</label>
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-foreground"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setEditingCardId(null)} className="flex-1 px-4 py-3 text-foreground font-bold bg-muted hover:bg-slate-200 rounded-xl transition-colors">
                    취소
                  </button>
                  <button type="submit" disabled={!editUrl.trim()} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50">
                    저장
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

