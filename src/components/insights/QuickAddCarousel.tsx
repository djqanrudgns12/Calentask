"use client";
import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function QuickAddCarousel({ templates }: { templates: any[] }) {
  const [showToast, setShowToast] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch('/api/activities/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: item.id,
          title: item.title,
          category_id: item.category_id,
          duration_minutes: item.duration_minutes
        })
      });
      if (!res.ok) throw new Error('Failed to add');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  });

  // Mock templates for UI if none exist
  const items = templates?.length > 0 ? templates : [
    { id: 1, title: 'Deep Work', duration_minutes: 120, bg: '#EEF2FF', text: '#4338CA' },
    { id: 2, title: 'HIIT Session', duration_minutes: 45, bg: '#ECFEFF', text: '#0E7490' }
  ];

  return (
    <div className="mt-8 relative">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Add</h2>
      
      {/* Hide scrollbar with inline styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      <div className="flex overflow-x-auto gap-3 pb-4 hide-scroll -mx-6 px-6">
        {items.map((item, idx) => (
          <button 
            key={item.id}
            onClick={() => mutation.mutate(item)}
            disabled={mutation.isPending}
            style={item.bg ? { backgroundColor: item.bg, color: item.text } : {}}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border text-sm font-bold whitespace-nowrap transition-transform active:scale-95 shadow-sm disabled:opacity-50 ${!item.bg ? 'bg-white text-gray-700 border-gray-100' : 'border-transparent'}`}
          >
            {mutation.isPending ? <Loader2 size={18} className="animate-spin opacity-70" /> : <Plus size={18} className="opacity-70" />}
            {item.title}
          </button>
        ))}
      </div>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-6">
          <span>✅ 일정이 추가되었습니다.</span>
          <button className="text-gray-400 underline underline-offset-4 hover:text-white ml-3">시간 수정</button>
        </div>
      )}
    </div>
  );
}
