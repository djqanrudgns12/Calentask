'use client'

import { useState, useEffect, useRef } from 'react';
import { Plus, Video, Play, X, Clock, Tag as TagIcon, LayoutGrid, List as ListIcon, Link as LinkIcon, Palette } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { FastAverageColor } from 'fast-average-color';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

// Extracts a thumbnail and standardizes URL if possible
function extractMediaMetadata(url: string) {
  let thumbnail = '';
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  
  if (ytMatch && ytMatch[2].length === 11) {
    thumbnail = `https://img.youtube.com/vi/${ytMatch[2]}/maxresdefault.jpg`;
  }
  
  return { thumbnail, url };
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

  const activeMedia = items.find(i => i.id === activeMediaId);

  return (
    <div className="w-full h-full bg-[#f7f9fb] p-6 md:p-10 overflow-y-auto hide-scrollbar relative">
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'masonry' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
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
              className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-end overflow-hidden"
            >
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                   <LinkIcon className="w-4 h-4 text-rose-500" />
                   미디어 URL (유튜브, 비메오, 사운드클라우드 등)
                </label>
                <input 
                  autoFocus
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-700"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-700 mb-2">제목 (선택)</label>
                <input 
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="직접 입력하지 않으면 자동 저장됩니다"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-700"
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
                  className="flex-1 md:flex-none px-4 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors h-[50px]"
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
            <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">영감을 수집할 준비가 되셨나요?</h3>
            <p className="text-slate-500 font-medium max-w-sm text-center">유튜브 비디오, 사운드클라우드 음악 등 모든 미디어를 여기에 기록하고 노트와 태그를 남기세요.</p>
          </div>
        ) : (
          <div className={`${
              viewMode === 'masonry' 
                ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6' 
                : 'flex flex-col gap-4'
            }`}
          >
            {items.map(item => (
              <motion.div 
                layoutId={`media-${item.id}`}
                key={item.id} 
                className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer break-inside-avoid ${viewMode === 'list' ? 'flex' : ''}`}
                onClick={() => setActiveMediaId(item.id)}
              >
                {/* Thumbnail */}
                <div 
                  className={`relative ${viewMode === 'masonry' ? 'w-full' : 'w-64 shrink-0 aspect-video'}`}
                  style={{ backgroundColor: item.data?.color || '#0f172a' }}
                >
                  {item.data?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={item.data.thumbnail} 
                      alt={item.title} 
                      className={`w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity ${viewMode === 'masonry' ? 'aspect-auto min-h-[160px]' : ''}`} 
                    />
                  ) : (
                    <div className="w-full h-full aspect-video flex items-center justify-center">
                      <LinkIcon className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all border border-white/30">
                      <Play className="w-6 h-6 text-white ml-1 shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2">{item.title}</h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(activeTabId!, item.id); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {item.content && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-3 font-medium leading-relaxed">{item.content}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-5 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md"><Clock className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
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
            <motion.div 
              layoutId={`media-${activeMedia.id}`}
              className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* React Player Wrapper */}
              <div className="w-full md:w-2/3 bg-black relative flex flex-col justify-center min-h-[30vh]">
                <button 
                  onClick={() => setActiveMediaId(null)}
                  className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-full aspect-video flex items-center justify-center bg-black">
                  <ReactPlayer 
                    url={activeMedia.data?.url as string} 
                    width="100%" 
                    height="100%"
                    controls={true}
                    playing={true}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  />
                </div>
              </div>

              {/* Note Taking Area */}
              <div className="w-full md:w-1/3 bg-white flex flex-col h-[50vh] md:h-auto border-l border-slate-100">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50" style={{ borderTop: `4px solid ${activeMedia.data?.color || '#4f46e5'}` }}>
                  <input 
                    type="text"
                    value={activeMedia.title}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { title: e.target.value })}
                    className="font-black text-xl text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                    placeholder="제목 없는 미디어"
                  />
                  <button onClick={() => setActiveMediaId(null)} className="hidden md:flex p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors ml-4">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> 타임스탬프 북마크
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">영상 시청 중 인상 깊은 순간의 시간(예: 1:23)과 함께 기록을 남겨보세요.</p>
                  
                  <textarea 
                    value={activeMedia.content || ''}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { content: e.target.value })}
                    placeholder="[12:34] 핵심 인사이트 메모..."
                    className="flex-1 w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                  />
                  
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                       <TagIcon className="w-3.5 h-3.5" /> 태그 (쉼표로 구분)
                    </label>
                    <input 
                      type="text"
                      value={activeMedia.tags?.join(', ') || ''}
                      onChange={(e) => updateItem(activeTabId!, activeMedia.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="디자인, 영감, 튜토리얼..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
