'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutList, Image as ImageIcon, LayoutGrid, Table, Columns, Clock, Check } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

import { Youtube, FileText } from 'lucide-react'; // 아이콘 추가 임포트 필요할 수 있으나 lucide-react에서 가져온다고 가정.

const BOARD_TYPES = [
  { id: 'list', name: '문서 (Doc)', icon: FileText, desc: '텍스트 기반의 자유로운 줄글 노트' },
  { id: 'canvas', name: '캔버스', icon: LayoutGrid, desc: '무한한 자유도의 화이트보드' },
  { id: 'masonry', name: '비주얼 갤러리', icon: ImageIcon, desc: '이미지 및 파일 기반 영감 보드' },
  { id: 'table', name: '데이터베이스', icon: Table, desc: '자유도 높은 스프레드시트' },
  { id: 'kanban', name: '미디어 라이브러리', icon: Youtube, desc: '유튜브 등 미디어 시청 및 아카이브' },
  { id: 'journal', name: '저널', icon: Clock, desc: '시간 순으로 기록하는 다이어리' },
];

export function AddNoteDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('list');
  const { tabs, setTabs, setActiveTabId } = useArchiveStore();

  const handleAdd = () => {
    if (!name.trim()) return;
    const newId = Date.now().toString();
    setTabs([...tabs, { 
      id: newId, 
      name: name.trim(), 
      board_type: selectedType, 
      created_at: new Date().toISOString(),
      user_id: 'local',
      position: tabs.length,
      icon: null,
      is_secure: false
    }]);
    setActiveTabId(newId);
    onClose();
    setName('');
    setSelectedType('list');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">새 노트 추가</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">어떤 형태의 캔버스가 필요하신가요?</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto">
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">노트 제목</label>
                <input 
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 프로젝트 알파 아키텍처 구상"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 text-lg placeholder:font-medium placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-4">보드 템플릿 선택</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BOARD_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                            : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-3 rounded-xl ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-extrabold text-base mb-1 ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {type.name}
                          </h3>
                          <p className={`text-sm font-medium ${isSelected ? 'text-indigo-700/80' : 'text-slate-500'}`}>
                            {type.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-4 right-4 text-indigo-600">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAdd}
                disabled={!name.trim()}
                className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
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
