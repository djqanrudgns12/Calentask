"use client";
import { Settings2, Plus } from 'lucide-react';
import { useState } from 'react';
import { TemplateFormDialog } from './TemplateFormDialog';
import { TemplateManagementSheet } from './TemplateManagementSheet';
import type { ActivityTemplate } from '@/app/actions/insights';

export default function QuickAddCarousel({ templates }: { templates: ActivityTemplate[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplate | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleChipClick = (template: ActivityTemplate) => {
    setSelectedTemplate(template);
    setIsPopupOpen(true);
  };

  const handleSuccess = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="mt-8 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">빠른 일정 등록</h2>
      </div>
      
      <div className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar overscroll-x-contain touch-pan-x">
        {templates && templates.length > 0 ? (
          templates.map((item) => {
            const color = item.hex_color || '#4f46e5';
            
            return (
              <button 
                key={item.id}
                onClick={() => handleChipClick(item)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-transform hover:scale-105 active:scale-95 shadow-sm border border-border bg-card hover:bg-muted`}
                style={{ color: '#374151' }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {item.title}
                <div className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] ml-1">
                  {item.duration_minutes}분
                </div>
              </button>
            )
          })
        ) : (
          <div className="text-[13px] text-muted-foreground font-medium px-4 py-2.5 border border-dashed border-gray-300 rounded-full bg-muted">
            템플릿을 등록해보세요
          </div>
        )}

        <button 
          onClick={() => setIsManagementOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-transform hover:scale-105 active:scale-95 bg-indigo-50 text-indigo-600 ml-1 shrink-0"
        >
          <Settings2 size={16} />
          관리
        </button>
      </div>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-6">
          <span>✅ 캘린더에 일정이 추가되었습니다.</span>
          <button onClick={() => setShowToast(false)} className="text-muted-foreground underline underline-offset-4 hover:text-white ml-2 text-xs">닫기</button>
        </div>
      )}

      {/* 빠른 일정 템플릿 폼 (칩 클릭 시 quick-add 모드) */}
      <TemplateFormDialog 
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        editingTemplate={selectedTemplate}
        mode="quick-add"
        onQuickAddSuccess={handleSuccess}
      />

      {/* 관리 시트 (관리 버튼 클릭 시) */}
      <TemplateManagementSheet 
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
      />
    </div>
  );
}
