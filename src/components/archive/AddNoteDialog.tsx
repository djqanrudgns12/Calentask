'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutList, Image as ImageIcon, LayoutGrid, Table, Columns, Clock, Check, Network, Calendar } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

import { Video, FileText } from 'lucide-react';

const BOARD_TYPES = [
  { id: 'list', name: '문서 (Doc)', icon: FileText, desc: '텍스트 기반의 자유로운 줄글 노트' },
  { id: 'canvas', name: '캔버스', icon: LayoutGrid, desc: '무한한 자유도의 화이트보드' },
  { id: 'masonry', name: '비주얼 갤러리', icon: ImageIcon, desc: '이미지 및 파일 기반 영감 보드' },
  { id: 'table', name: '데이터베이스', icon: Table, desc: '자유도 높은 스프레드시트' },
  { id: 'kanban', name: '미디어 라이브러리', icon: Video, desc: '유튜브 등 미디어 시청 및 아카이브' },
  { id: 'journal', name: '저널', icon: Clock, desc: '시간 순으로 기록하는 다이어리' },
];

export function AddNoteDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTab } = useArchiveStore();

  const handleAdd = async () => {
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    await addTab({ 
      name: name.trim(), 
      board_type: selectedType, 
    });
    
    setIsSubmitting(false);
    onClose();
    setName('');
    setSelectedType('list');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start pt-12 md:pt-0 md:items-center justify-center p-4">
          {/* 왜: 모바일에서 키보드가 올라왔을 때 모달이 가려지지 않도록 상단 정렬로 변경 (데스크탑은 중앙 정렬 유지) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* 왜: 상단 정렬에 맞춰 최대 높이를 조절하여 잘림 방지 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)] md:max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-5 md:px-8 md:py-6 border-b border-border flex items-center justify-between bg-muted/50 shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-foreground">새 노트 추가</h2>
                <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">어떤 형태의 캔버스가 필요하신가요?</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5 md:w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 md:p-8 overflow-y-auto flex-1 min-h-0">
              <div className="mb-6 md:mb-8">
                <label className="block text-sm font-bold text-foreground mb-2">노트 제목</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 프로젝트 알파 아키텍처 구상"
                  className="w-full px-4 py-3 md:px-5 md:py-4 bg-muted border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-foreground text-base md:text-lg placeholder:font-medium placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-3 md:mb-4">보드 템플릿 선택</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {BOARD_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`relative flex items-start gap-3 md:gap-4 p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                            : 'border-border bg-card hover:border-indigo-200 hover:bg-muted'
                        }`}
                      >
                        <div className={`p-2.5 md:p-3 rounded-lg md:rounded-xl ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-extrabold text-sm md:text-base mb-0.5 md:mb-1 ${isSelected ? 'text-indigo-900' : 'text-foreground'}`}>
                            {type.name}
                          </h3>
                          <p className={`text-xs md:text-sm font-medium ${isSelected ? 'text-indigo-700/80' : 'text-muted-foreground'} leading-tight`}>
                            {type.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 md:top-4 md:right-4 text-indigo-600">
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:px-8 md:py-5 border-t border-border bg-muted flex justify-end gap-2 md:gap-3 shrink-0">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base text-foreground hover:bg-slate-200/50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAdd}
                disabled={!name.trim() || isSubmitting}
                className="px-6 py-2.5 md:px-8 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
              >
                생성하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Trigger recompile
