'use client'

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Maximize, MousePointer2, Type, Square, ArrowRight, PaintBucket, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Bold, PaintRoller } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb', '#ffffff'];

export function CanvasBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Pan and zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = e.deltaY * -0.01;
        setScale(prev => Math.min(Math.max(0.2, prev + zoomDelta), 3));
      } else {
        setPosition(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleAddSticky = () => {
    if (!activeTabId) return;
    addItem(activeTabId, {
      title: '새 스티키 노트',
      content: '내용을 입력하세요.',
      data: {
        x: -position.x + 200,
        y: -position.y + 200,
        color: COLORS[0],
        width: 240,
        height: 200
      }
    });
  };

  const handleDragEnd = (id: string, info: any) => {
    if (!activeTabId) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // update x, y
    updateItem(activeTabId, id, {
      data: {
        ...item.data,
        x: (item.data?.x || 0) + info.offset.x / scale,
        y: (item.data?.y || 0) + info.offset.y / scale
      }
    });
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-[#fafafa] rounded-3xl"
      onClick={() => setActiveItemId(null)}
    >
      {/* Background Grid */}
      <div 
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          touchAction: 'none',
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: `${30 * scale}px ${30 * scale}px`,
          backgroundPosition: `${position.x}px ${position.y}px`
        }}
      >
        <motion.div
          className="absolute inset-0 origin-top-left"
          style={{ x: position.x, y: position.y, scale }}
        >
          {items.map(item => {
            const isActive = activeItemId === item.id;
            const itemColor = item.data?.color || COLORS[0];
            return (
              <motion.div
                key={item.id}
                drag
                dragMomentum={false}
                onDragStart={() => setActiveItemId(item.id)}
                onDragEnd={(e, info) => handleDragEnd(item.id, info)}
                onClick={(e) => { e.stopPropagation(); setActiveItemId(item.id); }}
                className={`absolute shadow-md p-5 rounded-xl cursor-pointer ${isActive ? 'ring-2 ring-indigo-500 shadow-xl z-20' : 'hover:shadow-lg z-10'}`}
                style={{
                  x: item.data?.x || 0,
                  y: item.data?.y || 0,
                  width: item.data?.width || 240,
                  height: item.data?.height || 200,
                  backgroundColor: itemColor
                }}
              >
                {isActive && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg flex items-center gap-1 p-1 z-30 pointer-events-auto cursor-default">
                    {COLORS.map(c => (
                      <button 
                        key={c} 
                        onClick={(e) => { e.stopPropagation(); updateItem(activeTabId!, item.id, { data: { ...item.data, color: c }}); }}
                        className="w-6 h-6 rounded-full border border-slate-200" 
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Bold className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><AlignLeft className="w-4 h-4" /></button>
                  </div>
                )}
                
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(activeTabId!, item.id, { title: e.target.value })}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-slate-800 text-lg mb-2"
                  placeholder="제목"
                />
                <textarea
                  value={item.content || ''}
                  onChange={(e) => updateItem(activeTabId!, item.id, { content: e.target.value })}
                  className="w-full h-[calc(100%-2rem)] bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-medium resize-none leading-relaxed"
                  placeholder="내용을 입력하세요"
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white shadow-xl rounded-2xl p-2 flex flex-col gap-2 border border-slate-200">
        <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MousePointer2 className="w-5 h-5" /></button>
        <button onClick={handleAddSticky} className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"><Square className="w-5 h-5" /></button>
        <button className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"><Type className="w-5 h-5" /></button>
        <button className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"><ArrowRight className="w-5 h-5" /></button>
      </div>

      {/* Minimap Overlay */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4">
        <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl p-1.5 flex items-center gap-1 border border-slate-200">
          <button onClick={() => setScale(s => Math.max(0.2, s - 0.2))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-colors">-</button>
          <span className="text-xs font-bold text-slate-600 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-colors">+</button>
        </div>
      </div>
    </div>
  );
}
