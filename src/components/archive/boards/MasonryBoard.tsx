'use client'

import { useState, useRef } from 'react';
import { Upload, X, Maximize2, Image as ImageIcon, Trash2, Heart, Search, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

const EMPTY_ARRAY: any[] = [];

export function MasonryBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImage = items.find(i => i.id === activeImageId);

  // Supabase Storage로 파일 업로드 후 public URL 저장
  const processFiles = async (files: FileList | null) => {
    if (!files || !activeTabId) return;
    setIsUploading(true);
    
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${activeTabId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('archive_media')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading image:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('archive_media')
        .getPublicUrl(filePath);

      addItem(activeTabId, {
        title: file.name.split('.')[0],
        data: {
          image: publicUrl,
          likes: 0,
          originalName: file.name
        }
      });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
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
    processFiles(e.dataTransfer.files);
  };

  const handleLike = (e: React.MouseEvent, id: string, currentLikes: number = 0) => {
    e.stopPropagation();
    if (!activeTabId) return;
    updateItem(activeTabId, id, { data: { ...items.find(i => i.id === id)?.data, likes: currentLikes + 1 } });
  };

  const filteredItems = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div 
      className="w-full h-full bg-background p-4 md:p-10 overflow-y-auto hide-scrollbar relative pb-28 md:pb-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-4 mb-6 md:mb-8 sticky top-0 z-10 bg-background/90 backdrop-blur-md py-2 md:py-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 md:w-5 md:h-5 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이미지 검색..."
              className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 bg-card border border-border rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm md:text-base shadow-sm"
            />
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 md:py-3 bg-indigo-600 text-white font-bold rounded-xl md:rounded-2xl shadow-sm hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
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

        {/* Mobile Upload FAB */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(79,70,229,0.4)] z-40 hover:bg-indigo-700 active:scale-90 transition-all"
        >
          <Upload className="w-6 h-6" />
        </button>

        {/* Drag Drop Overlay */}
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center rounded-3xl border-4 border-dashed border-indigo-400 m-6"
            >
              <div className="bg-card p-8 rounded-2xl shadow-xl flex flex-col items-center">
                <Upload className="w-12 h-12 text-indigo-500 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-foreground">이미지를 이곳에 드롭하세요</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Masonry Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20 md:py-32 flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-card shadow-sm border border-border rounded-3xl flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-indigo-200" />
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-foreground mb-2 truncate px-4 w-full">영감을 업로드하세요</h3>
            <p className="text-muted-foreground font-medium mb-6 text-center text-sm md:text-base px-4">
              파일을 드래그 앤 드롭하거나 업로드 버튼을 눌러<br/>나만의 핀터레스트 보드를 만들어보세요.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {filteredItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                className="relative break-inside-avoid group cursor-zoom-in bg-card p-2 rounded-2xl shadow-sm border border-border hover:shadow-xl transition-all"
                onClick={() => setActiveImageId(item.id)}
              >
                <div className="relative rounded-xl overflow-hidden bg-muted">
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
                        className="w-8 h-8 bg-card/20 hover:bg-red-500 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${item.data?.likes > 0 ? 'fill-current text-white' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-end justify-between">
                      <h4 className="text-white font-bold truncate pr-4 text-sm">{item.title}</h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(activeTabId!, item.id); }}
                        className="w-8 h-8 bg-card/20 hover:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors shrink-0"
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
              onClick={() => { setActiveImageId(null); setIsFullscreen(false); setScale(1); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 max-w-5xl max-h-[90vh] flex flex-col md:flex-row bg-card rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="w-full md:w-2/3 bg-muted flex items-center justify-center relative overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeImage.data?.image} 
                  alt={activeImage.title} 
                  className="max-w-full max-h-[70vh] md:max-h-[90vh] object-contain"
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full md:w-1/3 bg-card p-6 md:p-8 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <input 
                    type="text"
                    value={activeImage.title}
                    onChange={(e) => updateItem(activeTabId!, activeImage.id, { title: e.target.value })}
                    className="font-extrabold text-2xl text-foreground bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                  />
                  <button 
                    onClick={() => { setActiveImageId(null); setIsFullscreen(false); setScale(1); }} 
                    className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors shrink-0 md:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <label className="text-xs font-bold text-muted-foreground block mb-2">상세 설명</label>
                  <textarea 
                    value={activeImage.content || ''}
                    onChange={(e) => updateItem(activeTabId!, activeImage.id, { content: e.target.value })}
                    placeholder="이 이미지에 대한 생각이나 영감을 적어보세요..."
                    className="w-full h-32 bg-muted border border-border rounded-xl p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
                
                <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                    <Heart className="w-4 h-4 text-red-500 fill-current" /> {activeImage.data?.likes || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleDownload(activeImage.data?.image, activeImage.data?.originalName || activeImage.title)} 
                      className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="다운로드"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteItem(activeTabId!, activeImage.id)} 
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && activeImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden"
          >
            <div className="absolute top-6 right-6 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-md p-2 rounded-2xl">
              <button 
                onClick={() => setScale(s => Math.max(0.1, s - 0.2))} 
                className="p-3 bg-card/10 hover:bg-card/20 rounded-full text-white transition-colors"
                title="축소"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setScale(s => s + 0.2)} 
                className="p-3 bg-card/10 hover:bg-card/20 rounded-full text-white transition-colors"
                title="확대"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-6 bg-card/20 mx-1"></div>
              <button 
                onClick={() => handleDownload(activeImage.data?.image, activeImage.data?.originalName || activeImage.title)} 
                className="p-3 bg-card/10 hover:bg-card/20 rounded-full text-white transition-colors"
                title="원본 다운로드"
              >
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setIsFullscreen(false); setScale(1); }} 
                className="p-3 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div 
              className="w-full h-full flex items-center justify-center cursor-move"
              onWheel={(e) => {
                if (e.deltaY > 0) setScale(s => Math.max(0.1, s - 0.1));
                else setScale(s => s + 0.1);
              }}
            >
              <motion.img 
                src={activeImage.data?.image} 
                alt={activeImage.title}
                drag
                dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
                dragElastic={0.1}
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="max-w-none max-h-none select-none"
                style={{ 
                  maxWidth: '100vw', 
                  maxHeight: '100vh',
                  objectFit: 'contain'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
