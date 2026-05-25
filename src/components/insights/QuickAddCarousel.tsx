"use client";
import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useCreateActivityFromTemplate } from '@/hooks/useInsightsQueries';

export default function QuickAddCarousel({ templates }: { templates: any[] }) {
  const [showToast, setShowToast] = useState(false);
  const mutation = useCreateActivityFromTemplate();

  const handleAdd = (id: string) => {
    mutation.mutate({ templateId: id }, {
      onSuccess: () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    });
  }

  return (
    <div className="mt-8 relative">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">빠른 일정 등록</h2>
      
      {/* Hide scrollbar with inline styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      <div className="flex overflow-x-auto gap-3 pb-4 hide-scroll -mx-6 px-6">
        {templates && templates.length > 0 ? (
          templates.map((item) => {
            const color = item.hex_color || '#374151';
            const bg = item.hex_color ? `${item.hex_color}1A` : '#F3F4F6';
            
            return (
              <button 
                key={item.id}
                onClick={() => handleAdd(item.id)}
                disabled={mutation.isPending}
                style={{ backgroundColor: bg, color: color }}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-transform active:scale-95 shadow-sm disabled:opacity-50 border-transparent`}
              >
                {mutation.isPending ? <Loader2 size={18} className="animate-spin opacity-70" /> : <Plus size={18} className="opacity-70" />}
                {item.title}
              </button>
            )
          })
        ) : (
          <div className="text-sm text-gray-400 font-medium px-4 py-3 border border-dashed border-gray-300 rounded-xl w-full text-center">
            등록된 템플릿이 없습니다.
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-6">
          <span>✅ 일정이 추가되었습니다.</span>
          <button onClick={() => setShowToast(false)} className="text-gray-400 underline underline-offset-4 hover:text-white ml-3">닫기</button>
        </div>
      )}
    </div>
  );
}
