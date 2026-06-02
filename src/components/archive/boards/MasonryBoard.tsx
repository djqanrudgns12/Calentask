'use client'

import { useState, useRef } from 'react';
import { Upload, X, Maximize2, Image as ImageIcon, Trash2, Heart, Search } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { motion, AnimatePresence } from 'framer-motion';

export function MasonryBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImage = items.find(i => i.id === activeImageId);

  // 로컬 파일을 Base64로 변환하여 스토어에 저장
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeTabId) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        addItem(activeTabId, {
          title: file.name.split('.')[0],
          data: {
            image: base64,
            likes: 0,
            originalName: file.name
          }
        });
      };
      reader.readAsDataURL(file);
    });
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsUploading(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsUploading(false);
    
    const files = e.dataTransfer.files;
    if (!files || !activeTabId) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        addItem(activeTabId, {
          title: file.name.split('.')[0],
          data: {
            image: base64,
            likes: 0,
            originalName: file.name
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLike = (e: React.MouseEvent, id: string, currentLikes: number = 0) => {
    e.stopPropagation();
    if (!activeTabId) return;
    updateItem(activeTabId, id, { data: { ...items.find(i => i.id === id)?.data, likes: currentLikes + 1 } });
  };

  const filteredItems = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div 
      className="w-full h-full bg-[#f7f9fb] p-6 md:p-10 overflow-y-auto hide-scrollbar relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8 sticky top-0 z-10 bg-[#f7f9fb]/90 backdrop-blur-md py-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이미지 검색..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm w-64 shadow-sm"
            />
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            업로드
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Drag Drop Overlay */}
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center rounded-3xl border-4 border-dashed border-indigo-400 m-6"
            >
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
                <Upload className="w-12 h-12 text-indigo-500 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-slate-800">이미지를 이곳에 드롭하세요</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Masonry Grid */}
        {items.length === 0 ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-24 h-24 bg-white shadow-sm border border-slate-100 rounded-3xl flex items-center justify-center mb-6">
              <ImageIcon className="w-12 h-12 text-indigo-200" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">영감을 업로드하세요</h3>
            <p className="text-slate-500 font-medium mb-6 text-center">
              파일을 드래그 앤 드롭하거나 업로드 버튼을 눌러<br/>나만의 핀터레스트 보드를 만들어보세요.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {filteredItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                className="relative break-inside-avoid group cursor-zoom-in bg-white p-2 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                onClick={() => setActiveImageId(item.id)}
              >
                <div className="relative rounded-xl overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={item.data?.image || ''} 
                    alt={item.title} 
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => handleLike(e, item.id, item.data?.likes)}
                        className="w-8 h-8 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${item.data?.likes > 0 ? 'fill-current text-white' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-end justify-between">
                      <h4 className="text-white font-bold truncate pr-4 text-sm">{item.title}</h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(activeTabId!, item.id); }}
                        className="w-8 h-8 bg-white/20 hover:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm cursor-zoom-out"
              onClick={() => setActiveImageId(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 max-w-5xl max-h-[90vh] flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="w-full md:w-2/3 bg-slate-100 flex items-center justify-center relative overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeImage.data?.image} 
                  alt={activeImage.title} 
                  className="max-w-full max-h-[70vh] md:max-h-[90vh] object-contain"
                />
                <button className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full md:w-1/3 bg-white p-6 md:p-8 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <input 
                    type="text"
                    value={activeImage.title}
                    onChange={(e) => updateItem(activeTabId!, activeImage.id, { title: e.target.value })}
                    className="font-extrabold text-2xl text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                  />
                  <button onClick={() => setActiveImageId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0 md:hidden">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 block mb-2">상세 설명</label>
                  <textarea 
                    value={activeImage.content || ''}
                    onChange={(e) => updateItem(activeTabId!, activeImage.id, { content: e.target.value })}
                    placeholder="이 이미지에 대한 생각이나 영감을 적어보세요..."
                    className="w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
                
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                    <Heart className="w-4 h-4 text-red-500 fill-current" /> {activeImage.data?.likes || 0}
                  </div>
                  <button onClick={() => deleteItem(activeTabId!, activeImage.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors">
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
