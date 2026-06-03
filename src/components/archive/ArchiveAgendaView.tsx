'use client'

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CheckCircle2, Circle, Clock, Trash2, 
  Archive as ArchiveIcon, Calendar, 
  Plus, Check, ChevronRight, CheckSquare, AlignLeft, Tag, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseNLPDate } from '@/lib/nlp';
import { AgendaTaskContextMenu } from './AgendaTaskContextMenu';
import { EditAgendaTaskDialog } from './EditAgendaTaskDialog';

import { useAgendaStore, TaskStatus, AgendaTask } from '@/store/useAgendaStore';
import { useCategories } from '@/hooks/useCalendarQueries';
import { useCalendarStore } from '@/store/useCalendarStore';

const TABS = [
  { id: 'inbox', label: 'Inbox', icon: Circle },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon },
  { id: 'trash', label: 'Bin', icon: Trash2 }
] as const;

export function ArchiveAgendaView() {
  const [activeTab, setActiveTab] = useState<TaskStatus>('inbox');
  
  const { tasks, fetchTasks, isInitialized, addTask, updateTask, setTaskStatus, addSubtask, updateSubtask, deleteSubtask } = useAgendaStore();
  const { data: categories = [] } = useCategories();
  const { openAddEvent } = useCalendarStore();

  useEffect(() => {
    if (!isInitialized) {
      fetchTasks();
    }
  }, [isInitialized, fetchTasks]);

  const [inputValue, setInputValue] = useState('');
  const [parsedData, setParsedData] = useState<{ title: string; date: Date | null; hasTime: boolean }>({ title: '', date: null, hasTime: false });

  // Quick Add State
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
  const [quickSubtasks, setQuickSubtasks] = useState<string[]>([]);
  const [quickSubtaskInput, setQuickSubtaskInput] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState<string | null>(null);
  const [quickMemo, setQuickMemo] = useState('');
  const [showTitleError, setShowTitleError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);


  // Detail Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgendaTask> | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setParsedData(parseNLPDate(val));
  };

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parsedData.title.trim()) {
      setShowTitleError(true);
      setTimeout(() => setShowTitleError(false), 500);
      inputRef.current?.focus();
      return;
    }

    addTask({
      title: parsedData.title,
      memo: quickMemo.trim() || null,
      deadline: parsedData.date ? parsedData.date.toISOString() : null,
      category_id: quickCategoryId,
      subtasks: quickSubtasks.length > 0 ? quickSubtasks : undefined
    });
    
    setInputValue('');
    setParsedData({ title: '', date: null, hasTime: false });
    setIsQuickAddExpanded(false);
    setQuickSubtasks([]);
    setQuickCategoryId(null);
    setQuickMemo('');
  };

  const handleQuickSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation();
      if (quickSubtaskInput.trim()) {
        setQuickSubtasks(prev => [...prev, quickSubtaskInput.trim()]);
        setQuickSubtaskInput('');
      }
    }
  };

  const handleMainInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };


  const openDetail = (task: AgendaTask) => {
    setSelectedTaskId(task.id);
    setEditForm(task);
  };

  const saveDetail = () => {
    if (selectedTaskId && editForm) {
      updateTask(selectedTaskId, editForm);
    }
    setSelectedTaskId(null);
    setEditForm(null);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTaskId) return;
    addSubtask(selectedTaskId, newSubtaskTitle);
    setNewSubtaskTitle('');
  };

  const filteredTasks = tasks.filter(t => t.status === activeTab);
  const selectedTaskData = tasks.find(t => t.id === selectedTaskId);

  const getDeadlineInfo = (isoDate: string) => {
    const date = new Date(isoDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = differenceInDays(target, today);

    if (diffDays < 0) return { label: '지연됨', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    if (diffDays === 0) return { label: '오늘 마감', color: 'bg-red-100 text-red-700 border-red-200' };
    if (diffDays <= 3) return { label: `D-${diffDays}`, color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (diffDays <= 6) return { label: `D-${diffDays}`, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: `D-${diffDays}`, color: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto w-full px-6 py-10 md:px-12">
        {/* Header */}
        <div className="shrink-0 mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">아젠다</h1>
          <p className="text-slate-500 font-medium text-lg">자연어로 새로운 할 일을 입력하고 체계적으로 관리하세요.</p>
        </div>

        {/* Quick Add Form (Minimalist & Professional) */}
        <motion.div 
          animate={showTitleError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            "relative shrink-0 mb-10 bg-white/80 backdrop-blur-2xl shadow-sm border transition-all duration-300",
            isQuickAddExpanded ? "rounded-3xl border-slate-200/60 shadow-lg" : "rounded-full border-white/80",
            showTitleError && "border-red-400 ring-4 ring-red-500/10"
          )}
        >
          {/* Main Input Line */}
          <div className="relative flex items-center h-16 px-5 group">
            <Plus className="w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors shrink-0" />
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleMainInputKeyDown}
              placeholder="예: '내일 오후 3시 팀 미팅 준비'"
              className="flex-1 h-full bg-transparent px-4 outline-none text-slate-800 font-bold text-xl placeholder:text-slate-400 placeholder:font-medium"
            />
            
            <div className="flex items-center gap-2 shrink-0">
              {parsedData.date && !isQuickAddExpanded && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {format(parsedData.date, 'MMM d, h:mm a', { locale: ko })}
                  </span>
                </div>
              )}
              <button 
                type="button"
                onClick={() => setIsQuickAddExpanded(!isQuickAddExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all border",
                  isQuickAddExpanded 
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-white text-slate-500 border-slate-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600"
                )}
              >
                {isQuickAddExpanded ? '닫기' : '+ 상세'}
              </button>
            </div>
          </div>

          {/* Expanded Panel */}
          <AnimatePresence>
            {isQuickAddExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-2 border-t border-slate-100/60 space-y-5">
                  {/* Category Chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => {
                        const isSelected = quickCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setQuickCategoryId(isSelected ? null : cat.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all border shadow-sm",
                              isSelected ? "bg-white border-transparent" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                            style={isSelected ? { color: cat.hex_color, borderColor: cat.hex_color, boxShadow: `0 0 0 1px ${cat.hex_color}20` } : {}}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.hex_color }} />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Badge (Expanded View) */}
                  {parsedData.date && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parsed Date</label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 w-fit">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-bold text-indigo-700">
                          {format(parsedData.date, 'yyyy년 M월 d일 a h:mm', { locale: ko })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Subtasks */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtasks</label>
                    <div className="space-y-2">
                      {quickSubtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-200 transition-colors">
                          <CheckSquare className="w-4 h-4 text-slate-400" />
                          <span className="flex-1 text-sm text-slate-700 font-medium">{st}</span>
                          <button 
                            type="button"
                            onClick={() => setQuickSubtasks(prev => prev.filter((_, i) => i !== idx))}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-200 focus-within:border-indigo-400 transition-colors">
                        <Plus className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={quickSubtaskInput}
                          onChange={(e) => setQuickSubtaskInput(e.target.value)}
                          onKeyDown={handleQuickSubtaskKeyDown}
                          placeholder="하위 작업을 입력하고 엔터..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memo</label>
                    <textarea 
                      value={quickMemo}
                      onChange={(e) => setQuickMemo(e.target.value)}
                      placeholder="추가적인 메모..."
                      className="w-full bg-slate-50 focus:bg-white p-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm text-slate-700 resize-none transition-colors h-20"
                    />
                  </div>
                  
                  {/* Action Footer */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsQuickAddExpanded(false)}
                      className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      취소
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAddTask()}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                    >
                      추가하기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 shrink-0 bg-white/40 p-1.5 rounded-2xl backdrop-blur-md border border-white/50 w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                  isActive 
                    ? "bg-white text-indigo-700 shadow-sm border border-white/80" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-20">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-white/80 flex items-center justify-center border border-slate-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-lg">해당 항목이 없습니다</p>
              <p className="text-sm text-slate-500 mt-1">이곳은 깨끗하네요!</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const category = categories.find(c => c.id === task.category_id);
              const deadlineInfo = task.deadline ? getDeadlineInfo(task.deadline) : null;
              
              return (
                <div 
                  key={task.id}
                  className="group relative flex items-center gap-4 p-4 md:p-5 bg-white/60 backdrop-blur-md hover:bg-white/80 border border-white/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                  onClick={() => openDetail(task)}
                >
                  {/* Status Toggle Button */}
                  <button 
                    className="flex-shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskStatus(task.id, task.status === 'done' ? 'inbox' : 'done');
                    }}
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="w-7 h-7 text-indigo-500" />
                    ) : (
                      <Circle className="w-7 h-7" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={cn("text-[17px] font-extrabold truncate transition-all", task.status === 'done' ? "text-slate-400 line-through" : "text-slate-800")}>
                        {task.title}
                      </h3>
                    </div>
                    
                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 mt-2">
                      {category && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-100 shadow-sm">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: category.hex_color }} />
                          <span className="text-xs font-bold text-slate-600">{category.name}</span>
                        </div>
                      )}
                      
                      {deadlineInfo && (
                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm", deadlineInfo.color)}>
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-extrabold tracking-wide">{deadlineInfo.label}</span>
                        </div>
                      )}
                      
                      {task.memo && (
                        <div className="flex items-center gap-1 px-2 py-1 text-slate-400 bg-white/50 rounded-lg shadow-sm border border-slate-100">
                          <AlignLeft className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {task.subtasks?.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 text-slate-500 bg-white/50 rounded-lg shadow-sm border border-slate-100">
                          <CheckSquare className="w-3 h-3" />
                          <span className="text-[11px] font-bold">{task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 absolute right-5 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl px-2 py-1.5 rounded-xl border border-slate-100 shadow-sm z-10">
                    <AgendaTaskContextMenu 
                      status={task.status} 
                      onEdit={() => openDetail(task)} 
                      onChangeStatus={(s) => setTaskStatus(task.id, s)} 
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      
      <EditAgendaTaskDialog 
        task={selectedTaskData || null}
        isOpen={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          setEditForm(null);
        }}
        categories={categories}
        onSave={updateTask}
        onAddSubtask={addSubtask}
        onUpdateSubtask={updateSubtask}
        onDeleteSubtask={deleteSubtask}
      />
    </div>
  );
}
