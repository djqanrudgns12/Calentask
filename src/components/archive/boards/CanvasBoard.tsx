'use client'

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function CanvasBoard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Handle Trackpad / Mouse Wheel for pan and zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent browser scrolling/zooming
      
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom (trackpad) or Ctrl+Scroll
        const zoomDelta = e.deltaY * -0.01;
        setScale(prev => Math.min(Math.max(0.3, prev + zoomDelta), 3));
      } else {
        // Two-finger pan (trackpad) or scroll
        setPosition(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#fafafa] overflow-hidden relative cursor-grab active:cursor-grabbing rounded-3xl"
      style={{
        touchAction: 'none',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: `${30 * scale}px ${30 * scale}px`,
        backgroundPosition: `${position.x}px ${position.y}px`
      }}
    >
      <motion.div
        className="absolute inset-0 origin-top-left"
        style={{
          x: position.x,
          y: position.y,
          scale: scale,
        }}
        drag
        dragMomentum={false}
        onDrag={(e, info) => {
          setPosition({ x: position.x + info.delta.x, y: position.y + info.delta.y });
        }}
      >
        {/* Connection Line Simulation */}
        <svg className="absolute top-0 left-0 w-[2000px] h-[2000px] pointer-events-none">
          <path d="M 280 200 C 350 200, 350 120, 420 120" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="5,5" />
        </svg>

        {/* Sticky Note 1 */}
        <motion.div 
          drag
          dragMomentum={false}
          onDrag={(e) => e.stopPropagation()}
          className="absolute top-32 left-32 w-56 h-48 bg-yellow-200/95 backdrop-blur-sm shadow-lg p-5 rounded-xl cursor-pointer hover:shadow-xl transition-shadow"
        >
          <div className="w-12 h-1.5 bg-yellow-400/60 rounded-full mb-3" />
          <h3 className="font-bold text-slate-800 text-lg mb-2">Define MVPs</h3>
          <p className="font-medium text-slate-700 text-sm leading-relaxed">Define core features and target audience for Project Alpha.</p>
        </motion.div>

        {/* Sticky Note 2 */}
        <motion.div 
          drag
          dragMomentum={false}
          onDrag={(e) => e.stopPropagation()}
          className="absolute top-20 left-[420px] w-64 h-32 bg-emerald-200/95 backdrop-blur-sm shadow-lg p-5 rounded-xl cursor-pointer hover:shadow-xl transition-shadow"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-slate-800 text-lg">Tech Stack</h3>
            <span className="px-2 py-1 bg-emerald-300/50 rounded-md text-[10px] font-bold text-emerald-800">#Dev</span>
          </div>
          <p className="font-medium text-slate-700 text-sm">React, Next.js, Framer Motion, and Tailwind CSS.</p>
        </motion.div>
      </motion.div>

      {/* Minimap / Controls Overlay */}
      <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl p-1.5 flex items-center gap-1 border border-slate-200">
        <button onClick={() => setScale(s => Math.max(0.3, s - 0.2))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-colors">-</button>
        <span className="text-xs font-bold text-slate-600 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-colors">+</button>
      </div>
    </div>
  );
}
