import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Clock, Trash2, Plus, ChevronRight, CheckSquare, AlignLeft, Tag, NotebookTabs, Pencil, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DateTimePickerPopover } from '@/components/ui/DateTimePickerPopover';
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
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

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
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-transparent/60 p-0 overflow-hidden hide-scrollbar">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/50">
          <DialogTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <NotebookTabs className="w-6 h-6 text-indigo-500" />
            Agenda Info
          </DialogTitle>
        </div>
        
        <div className="p-8 max-h-[70vh] overflow-y-auto hide-scrollbar">
          {/* Title Edit */}
          <div className="mb-8">
            <Label className="block text-sm font-bold text-foreground mb-2">제목</Label>
            <Input 
              value={editForm.title || ''}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-card/60 border border-border shadow-sm rounded-xl px-4 py-6 font-bold text-lg focus-visible:ring-indigo-500/30"
            />
          </div>

          {/* Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div>
              <Label className="block text-[13px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> 카테고리</Label>
              <select 
                value={editForm.category_id || ''}
                onChange={e => setEditForm({ ...editForm, category_id: e.target.value || null })}
                className="w-full h-10 bg-card/60 border border-border shadow-sm rounded-xl px-3 font-bold text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none"
              >
                <option value="">카테고리 없음</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="overflow-hidden">
              <Label className="block text-[13px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> 데드라인</Label>
              <DateTimePickerPopover 
                date={editForm.deadline ? new Date(editForm.deadline) : null} 
                setDate={(d: Date | null) => setEditForm({ ...editForm, deadline: d ? d.toISOString() : null })}
                align="start"
              >
                <div className="flex items-center gap-2 px-3 h-10 bg-card/60 hover:bg-card rounded-xl border border-border hover:border-indigo-300 hover:shadow-sm transition-all w-full cursor-pointer overflow-hidden">
                  <span className={cn(
                    "flex-1 text-[13px] font-bold text-left whitespace-nowrap overflow-hidden text-ellipsis",
                    editForm.deadline ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {editForm.deadline ? format(new Date(editForm.deadline), 'yy.M.d a h:mm', { locale: ko }) : '마감일 설정'}
                  </span>
                </div>
              </DateTimePickerPopover>
            </div>
            <div>
              <Label className="block text-[13px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5"/> 중요도</Label>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, is_important: !editForm.is_important })}
                className={cn(
                  "w-full flex items-center justify-center gap-2 h-10 border shadow-sm rounded-xl px-3 font-bold text-[13px] transition-all",
                  editForm.is_important 
                    ? "bg-amber-50 text-amber-600 border-amber-200" 
                    : "bg-card/60 text-muted-foreground border-border hover:bg-card hover:text-foreground"
                )}
              >
                <Star className={cn("w-4 h-4", editForm.is_important ? "fill-current" : "")} />
                {editForm.is_important ? '중요함' : '일반'}
              </button>
            </div>
          </div>

          {/* Subtasks */}
          <div className="mb-8">
            <Label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-1"><CheckSquare className="w-4 h-4"/> 하위 체크리스트</Label>
            <div className="space-y-2">
              {task.subtasks?.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-3 bg-card/50 border border-border shadow-sm rounded-xl group hover:bg-card/70 transition-colors">
                  <button onClick={() => onUpdateSubtask(task.id, sub.id, { is_completed: !sub.is_completed })}>
                    {sub.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/50 group-hover:text-indigo-400" />
                    )}
                  </button>
                  {editingSubtaskId === sub.id ? (
                    <Input 
                      autoFocus
                      value={editSubtaskTitle}
                      onChange={e => setEditSubtaskTitle(e.target.value)}
                      onBlur={() => {
                        if (editSubtaskTitle.trim() !== sub.title) {
                          onUpdateSubtask(task.id, sub.id, { title: editSubtaskTitle.trim() });
                        }
                        setEditingSubtaskId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (editSubtaskTitle.trim() !== sub.title) {
                            onUpdateSubtask(task.id, sub.id, { title: editSubtaskTitle.trim() });
                          }
                          setEditingSubtaskId(null);
                        } else if (e.key === 'Escape') {
                          setEditingSubtaskId(null);
                        }
                      }}
                      className="flex-1 h-8 text-sm font-bold bg-card border-indigo-200 focus-visible:ring-indigo-500/30 px-2"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditSubtaskTitle(sub.title); }}
                      className={cn("font-bold flex-1 select-none", sub.is_completed ? "text-muted-foreground line-through" : "text-foreground")}
                    >
                      {sub.title}
                    </span>
                  )}
                  
                  {editingSubtaskId !== sub.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button onClick={() => { setEditingSubtaskId(sub.id); setEditSubtaskTitle(sub.title); }} className="p-1 text-muted-foreground hover:text-indigo-500 transition-colors" title="수정">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteSubtask(task.id, sub.id)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <form onSubmit={handleAddSubtaskSubmit} className="relative mt-2">
                <Input 
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="하위 작업 추가 후 엔터..."
                  className="w-full bg-card/50 border border-transparent shadow-sm rounded-xl px-4 py-5 pl-10 font-bold text-sm focus-visible:ring-indigo-500/30 text-foreground placeholder:text-muted-foreground"
                />
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </form>
            </div>
          </div>

          {/* Memo */}
          <div>
            <Label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4"/> 메모</Label>
            <Textarea 
              rows={4}
              value={editForm.memo || ''}
              onChange={e => setEditForm({ ...editForm, memo: e.target.value })}
              className="w-full bg-card/60 border border-border shadow-sm rounded-xl px-4 py-3 font-medium text-sm text-foreground focus-visible:ring-indigo-500/30 resize-none transition-all"
              placeholder="추가적인 메모나 참고사항을 자유롭게 적어주세요."
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-5 border-t border-border bg-muted/50">
          <Button onClick={handleSave} className="px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
            저장하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
