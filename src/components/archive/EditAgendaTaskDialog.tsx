import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Clock, Trash2, Plus, ChevronRight, CheckSquare, AlignLeft, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgendaTask, AgendaSubtask } from '@/store/useAgendaStore';

interface Category {
  id: string;
  name: string;
}

interface EditAgendaTaskDialogProps {
  task: AgendaTask | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (id: string, updates: Partial<AgendaTask>) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (taskId: string, subtaskId: string, updates: Partial<AgendaSubtask>) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export function EditAgendaTaskDialog({ 
  task, 
  isOpen, 
  onClose, 
  categories, 
  onSave, 
  onAddSubtask, 
  onUpdateSubtask, 
  onDeleteSubtask 
}: EditAgendaTaskDialogProps) {
  const [editForm, setEditForm] = useState<Partial<AgendaTask>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setEditForm(task);
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    onSave(task.id, editForm);
    onClose();
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle);
    setNewSubtaskTitle('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSave()}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 p-0 overflow-hidden hide-scrollbar">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <DialogTitle className="text-2xl font-extrabold text-slate-800">할 일 상세</DialogTitle>
        </div>
        
        <div className="p-8 max-h-[70vh] overflow-y-auto hide-scrollbar">
          {/* Title Edit */}
          <div className="mb-8">
            <Label className="block text-sm font-bold text-slate-600 mb-2">제목</Label>
            <Input 
              value={editForm.title || ''}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-white/60 border border-slate-200 shadow-sm rounded-xl px-4 py-6 font-bold text-lg focus-visible:ring-indigo-500/30"
            />
          </div>

          {/* Properties */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <Label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><Tag className="w-4 h-4"/> 카테고리</Label>
              <select 
                value={editForm.category_id || ''}
                onChange={e => setEditForm({ ...editForm, category_id: e.target.value || null })}
                className="w-full h-12 bg-white/60 border border-slate-200 shadow-sm rounded-xl px-4 font-bold text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
              >
                <option value="">카테고리 없음</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><Clock className="w-4 h-4"/> 데드라인</Label>
              <Input 
                type="datetime-local" 
                value={editForm.deadline ? new Date(editForm.deadline).toISOString().slice(0, 16) : ''}
                onChange={e => {
                  const dt = e.target.value;
                  setEditForm({ ...editForm, deadline: dt ? new Date(dt).toISOString() : null });
                }}
                className="w-full h-12 bg-white/60 border border-slate-200 shadow-sm rounded-xl px-4 font-bold text-sm text-slate-700 focus-visible:ring-indigo-500/30" 
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="mb-8">
            <Label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><CheckSquare className="w-4 h-4"/> 하위 체크리스트</Label>
            <div className="space-y-2">
              {task.subtasks?.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-3 bg-white/50 border border-slate-100 shadow-sm rounded-xl group hover:bg-white/70 transition-colors">
                  <button onClick={() => onUpdateSubtask(task.id, sub.id, { is_completed: !sub.is_completed })}>
                    {sub.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />
                    )}
                  </button>
                  <span className={cn("font-bold flex-1", sub.is_completed ? "text-slate-400 line-through" : "text-slate-700")}>{sub.title}</span>
                  <button onClick={() => onDeleteSubtask(task.id, sub.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <form onSubmit={handleAddSubtaskSubmit} className="relative mt-2">
                <Input 
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="하위 작업 추가 후 엔터..."
                  className="w-full bg-white/50 border border-transparent shadow-sm rounded-xl px-4 py-5 pl-10 font-bold text-sm focus-visible:ring-indigo-500/30 text-slate-700 placeholder:text-slate-400"
                />
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </form>
            </div>
          </div>

          {/* Memo */}
          <div>
            <Label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4"/> 메모</Label>
            <Textarea 
              rows={4}
              value={editForm.memo || ''}
              onChange={e => setEditForm({ ...editForm, memo: e.target.value })}
              className="w-full bg-white/60 border border-slate-200 shadow-sm rounded-xl px-4 py-3 font-medium text-sm text-slate-700 focus-visible:ring-indigo-500/30 resize-none transition-all"
              placeholder="추가적인 메모나 참고사항을 자유롭게 적어주세요."
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <Button onClick={handleSave} className="px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
            저장하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
