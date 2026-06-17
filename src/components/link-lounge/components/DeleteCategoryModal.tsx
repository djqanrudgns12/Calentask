import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, ArrowRight } from 'lucide-react';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  categoryName: string;
  bookmarkCount: number;
  onClose: () => void;
  onConfirm: (deleteLinks: boolean) => void;
}

export function DeleteCategoryModal({ isOpen, categoryName, bookmarkCount, onClose, onConfirm }: DeleteCategoryModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden p-6 md:p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-foreground mb-2">
              '{categoryName}' 탭 삭제
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              이 카테고리에는 <strong className="text-foreground">{bookmarkCount}개</strong>의 북마크가 있습니다. 어떻게 처리하시겠습니까?
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => onConfirm(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <span>예, 링크까지 모두 삭제합니다</span>
                </div>
              </button>
              
              <button 
                onClick={() => onConfirm(false)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5" />
                  <span>아니오, 링크는 '기타'로 이동시킵니다</span>
                </div>
              </button>
              
              <button 
                onClick={onClose}
                className="w-full px-4 py-3.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors mt-2"
              >
                취소
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
