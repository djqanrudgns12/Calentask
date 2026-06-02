'use client'

import { useState } from 'react';
import { Plus, Youtube, Play, X, Clock, Tag as TagIcon, MoreVertical, LayoutGrid, List as ListIcon, Maximize2 } from 'lucide-react';
import { useArchiveStore, BoardItem } from '@/store/useArchiveStore';
import { motion, AnimatePresence } from 'framer-motion';

function extractYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function MediaBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId || !newUrl.trim()) return;

    const videoId = extractYoutubeId(newUrl);
    if (!videoId) {
      alert('유효한 유튜브 URL이 아닙니다.');
      return;
    }

    addItem(activeTabId, {
      title: newTitle.trim() || '새로운 미디어',
      data: {
        youtubeId: videoId,
        url: newUrl,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
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
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
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
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-sm hover:bg-red-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            미디어 추가
          </button>
        </div>

        {/* Add Media Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleAddMedia}
              className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 mb-8 flex gap-4 items-end"
            >
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">유튜브 URL</label>
                <input 
                  autoFocus
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-700"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">제목 (선택)</label>
                <input 
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="직접 입력하지 않으면 나중에 수정 가능합니다"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-700"
                />
              </div>
              <button 
                type="submit"
                disabled={!newUrl.trim()}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-sm hover:bg-red-700 disabled:opacity-50 transition-all h-[50px]"
              >
                저장
              </button>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors h-[50px]"
              >
                취소
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Media Grid / List */}
        {items.length === 0 && !isAdding ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Youtube className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">아카이빙된 미디어가 없습니다</h3>
            <p className="text-slate-500">유튜브 영상을 추가하고 영감을 기록해보세요.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {items.map(item => (
              <div 
                key={item.id} 
                className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer ${viewMode === 'list' ? 'flex' : ''}`}
                onClick={() => setActiveMediaId(item.id)}
              >
                {/* Thumbnail */}
                <div className={`relative bg-slate-900 ${viewMode === 'grid' ? 'aspect-video w-full' : 'w-64 shrink-0 aspect-video'}`}>
                  {item.data?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.data.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Youtube className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-white ml-1" />
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
                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {item.content && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2 font-medium">{item.content}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.tags && item.tags.length > 0 && (
                      <span className="flex items-center gap-1"><TagIcon className="w-3.5 h-3.5" /> {item.tags.length}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Viewer Modal (PiP & Note Taking) */}
      <AnimatePresence>
        {activeMedia && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setActiveMediaId(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Video Player */}
              <div className="w-full md:w-2/3 bg-black relative">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                   <button className="px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-colors">
                     <Maximize2 className="w-3.5 h-3.5" /> PiP 모드
                   </button>
                </div>
                <button 
                  onClick={() => setActiveMediaId(null)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors md:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-full h-full aspect-video md:aspect-auto">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${activeMedia.data?.youtubeId}?autoplay=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Note Taking Area */}
              <div className="w-full md:w-1/3 bg-white flex flex-col h-[50vh] md:h-auto">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
                  <input 
                    type="text"
                    value={activeMedia.title}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { title: e.target.value })}
                    className="font-extrabold text-xl text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                  />
                  <button onClick={() => setActiveMediaId(null)} className="hidden md:flex p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors ml-4">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> 타임스탬프 북마크
                  </h4>
                  <p className="text-xs text-slate-400">영상 시청 중 인상 깊은 순간의 시간(예: 1:23)과 함께 기록을 남겨보세요.</p>
                  
                  <textarea 
                    value={activeMedia.content || ''}
                    onChange={(e) => updateItem(activeTabId!, activeMedia.id, { content: e.target.value })}
                    placeholder="[12:34] 이 부분의 프레임워크 설명이 매우 유익함..."
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                  />
                  
                  <div className="mt-auto">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">태그 (쉼표로 구분)</label>
                    <input 
                      type="text"
                      value={activeMedia.tags?.join(', ') || ''}
                      onChange={(e) => updateItem(activeTabId!, activeMedia.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="디자인, 영감, 튜토리얼..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
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
