'use client'

export function GalleryBoard() {
  const images = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1550757750-4ce187a65014?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1600607688969-a5bfcd64bd28?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1502691876148-a84978e59af8?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600'
  ];

  return (
    <div className="w-full h-full bg-white p-6 md:p-10 overflow-y-auto rounded-3xl hide-scrollbar">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {images.map((src, i) => (
          <div key={i} className="aspect-square bg-slate-100 rounded-3xl overflow-hidden group relative shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={src} 
              alt={`Gallery image ${i+1}`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              <span className="text-white font-bold text-sm">Image {i+1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
