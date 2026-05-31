'use client'

import { ExternalLink, Heart, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data to simulate URL OpenGraph parsed results
const mockCards = [
  { id: '1', title: 'Minimalist Architecture', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd64bd28?auto=format&fit=crop&q=80&w=800', height: 320, source: 'unsplash.com' },
  { id: '2', title: 'Typography Inspiration', image: 'https://images.unsplash.com/photo-1550757750-4ce187a65014?auto=format&fit=crop&q=80&w=800', height: 240, source: 'awwwards.com' },
  { id: '3', title: 'Framer Motion Examples', height: 180, source: 'framer.com', description: 'Great examples of spring physics.' },
  { id: '4', title: 'Color Palettes 2024', image: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?auto=format&fit=crop&q=80&w=800', height: 400, source: 'dribbble.com' },
  { id: '5', title: 'Grid Layout Ideas', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800', height: 200, source: 'behance.net' },
];

export function MasonryBoard() {
  return (
    <div className="w-full h-full overflow-y-auto bg-[#fafafa] p-6 md:p-10 rounded-3xl hide-scrollbar">
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {mockCards.map((card) => (
          <div key={card.id} className="break-inside-avoid relative group bg-white rounded-3xl shadow-sm border border-slate-100/60 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 transform hover:-translate-y-1">
            {card.image && (
              <div className="w-full relative overflow-hidden bg-slate-100" style={{ height: card.height }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} alt={card.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
            )}
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-1.5 leading-snug">{card.title}</h3>
              {card.description && <p className="text-sm text-slate-500 mb-4 font-medium leading-relaxed">{card.description}</p>}
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {card.source}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
