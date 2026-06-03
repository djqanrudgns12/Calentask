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
import { DateTimePickerPopover } from '@/components/ui/DateTimePickerPopover';
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState<string>('');
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

  const toggleTaskExpansion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleQuickAddSubtask = (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitles[taskId]?.trim();
    if (title) {
      addSubtask(taskId, title);
      setNewSubtaskTitles(prev => ({ ...prev, [taskId]: '' }));
    }
  };

  const handleTabChange = (tabId: TaskStatus) => {
    setActiveTab(tabId);
    setSelectedTaskIds(new Set());
  };

  const { tasks, fetchTasks, isInitialized, addTask, updateTask, setTaskStatus, addSubtask, updateSubtask, deleteSubtask, deleteTask } = useAgendaStore();
  const { data: categories = [] } = useCategories();
  const { openAddEvent } = useCalendarStore();


  const filteredTasks = tasks.filter(t => t.status === activeTab);
  
  const handleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const toggleTaskSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTaskIds(newSet);
  };

  const handleBulkDelete = () => {
    if (confirm(`선택한 ${selectedTaskIds.size}개 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      selectedTaskIds.forEach(id => deleteTask(id));
      setSelectedTaskIds(new Set());
    }
  };
  
  const handleBulkRestore = () => {
    selectedTaskIds.forEach(id => setTaskStatus(id, 'inbox'));
    setSelectedTaskIds(new Set());
  };

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
      {/* Subtle Background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar w-full">
        <div className="flex flex-col min-h-full max-w-5xl mx-auto w-full px-4 md:px-8 py-6">


        {/* Quick Add Form (Minimalist & Professional) */}
        <motion.div 
          animate={showTitleError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            "relative z-20 shrink-0 mb-6 bg-white/80 backdrop-blur-3xl shadow-sm border transition-all duration-300",
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
                <div className="p-5 pt-3 border-t border-slate-100/60 space-y-4">
                  {/* Category Chips */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20 pt-1">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map(cat => {
                        const isSelected = quickCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setQuickCategoryId(isSelected ? null : cat.id)}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border shadow-sm",
                              isSelected ? "bg-white border-transparent" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                            style={isSelected ? { color: cat.hex_color, borderColor: cat.hex_color, boxShadow: `0 0 0 1px ${cat.hex_color}20` } : {}}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.hex_color }} />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom DateTime Picker (Expanded View) */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20 pt-1.5">Deadline</label>
                    <DateTimePickerPopover 
                      date={parsedData.date} 
                      setDate={(d: Date | null) => setParsedData(prev => ({ ...prev, date: d, hasTime: true }))}
                      align="start"
                    >
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-white rounded-md border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all w-max cursor-pointer">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className={cn(
                          "text-[11px] font-bold text-left whitespace-nowrap",
                          parsedData.date ? "text-slate-700" : "text-slate-500"
                        )}>
                          {parsedData.date ? format(parsedData.date, 'yyyy년 M월 d일 a h:mm', { locale: ko }) : '마감일 설정'}
                        </span>
                      </div>
                    </DateTimePickerPopover>
                  </div>

                  {/* Subtasks */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20 pt-2">Subtasks</label>
                    <div className="flex-1 space-y-2 max-w-xl">
                      {quickSubtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100 group">
                          <Circle className="w-3 h-3 text-slate-300" />
                          <span className="flex-1 text-[12px] font-bold text-slate-700">{st}</span>
                          <button 
                            type="button"
                            onClick={() => setQuickSubtasks(prev => prev.filter((_, i) => i !== idx))}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="relative">
                        <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input 
                          type="text"
                          value={quickSubtaskInput}
                          onChange={e => setQuickSubtaskInput(e.target.value)}
                          onKeyDown={handleQuickSubtaskKeyDown}
                          placeholder="하위 작업을 입력하고 엔터..."
                          className="w-full bg-slate-50/50 border border-transparent shadow-sm rounded-lg py-1.5 pl-7 pr-3 text-[12px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20 pt-2">Memo</label>
                    <div className="flex-1 max-w-xl">
                      <textarea 
                        rows={1}
                        value={quickMemo}
                        onChange={e => setQuickMemo(e.target.value)}
                        placeholder="추가적인 메모..."
                        className="w-full bg-slate-50/50 border border-transparent shadow-sm rounded-lg p-2 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white resize-y min-h-[40px] transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      type="button"
                      onClick={() => setIsQuickAddExpanded(false)}
                      className="px-4 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-[13px] font-bold rounded-lg transition-colors"
                    >
                      취소
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAddTask()}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center p-1.5 bg-slate-100 rounded-[1.25rem] w-full sm:w-auto overflow-x-auto hide-scrollbar border border-slate-200/60 shadow-inner">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              let activeColor = "text-slate-800 bg-white shadow-sm border border-slate-200/60";
              let iconColor = "text-slate-700";
              if (isActive) {
                if (tab.id === 'done') { activeColor = "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200/60"; iconColor = "text-emerald-600"; }
                else if (tab.id === 'trash') { activeColor = "bg-red-50 text-red-700 shadow-sm border border-red-200/60"; iconColor = "text-red-600"; }
                else if (tab.id === 'archive') { activeColor = "bg-orange-50 text-orange-700 shadow-sm border border-orange-200/60"; iconColor = "text-orange-600"; }
                else { activeColor = "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/60"; iconColor = "text-indigo-600"; }
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                    isActive ? activeColor : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? iconColor : "text-slate-400")} />
                  {tab.label}
                </button>
              )
            })}
          </div>
          
          {activeTab === 'trash' && filteredTasks.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                {selectedTaskIds.size === filteredTasks.length ? '선택 해제' : '전체 선택'}
              </button>
              {selectedTaskIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={handleBulkRestore}
                    className="px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    선택 복구
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                  >
                    선택 영구삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task List */}
        <div className="flex-1 space-y-3 pb-20">
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
                <div key={task.id} className="flex flex-col gap-1.5 group">
                  <div 
                    className="relative flex items-center gap-4 p-4 md:p-5 bg-white/70 backdrop-blur-xl hover:bg-white border border-white/60 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => openDetail(task)}
                  >
                  {/* Status Toggle Button */}
                  {activeTab === 'trash' ? (
                    <button 
                      className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                        selectedTaskIds.has(task.id) ? "bg-indigo-500 border-indigo-500" : "border-slate-300 hover:border-indigo-400"
                      )}
                      onClick={(e) => toggleTaskSelection(task.id, e)}
                    >
                      {selectedTaskIds.has(task.id) && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ) : (
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
                  )}

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={cn("text-[17px] font-extrabold truncate transition-all", task.status === 'done' ? "text-slate-400 line-through" : "text-slate-800")}>
                        {task.title}
                      </h3>
                    </div>
                    
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      {category && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: category.hex_color }} />
                          <span className="text-[12px] font-bold text-slate-700">{category.name}</span>
                        </div>
                      )}
                      
                      {deadlineInfo && (
                        <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm bg-white", deadlineInfo.color.replace('bg-', 'text-').replace('text-', 'border-').replace('100', '200'))}>
                          <Calendar className={cn("w-3.5 h-3.5", deadlineInfo.color.replace('bg-', 'text-').split(' ')[1])} />
                          <span className={cn("text-[12px] font-bold", deadlineInfo.color.replace('bg-', 'text-').split(' ')[1])}>{deadlineInfo.label}</span>
                        </div>
                      )}
                      
                      {task.memo && (
                        <div className="flex items-center gap-1 px-3 py-1 text-slate-500 bg-slate-50 rounded-full shadow-sm border border-slate-200 hover:bg-slate-100 transition-colors">
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span className="text-[12px] font-bold">메모 있음</span>
                        </div>
                      )}

                      {task.subtasks && task.subtasks.length > 0 && (
                        <button 
                          onClick={(e) => toggleTaskExpansion(task.id, e)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span className="text-[12px] font-bold">
                            {task.subtasks.filter((s: any) => s.is_completed).length}/{task.subtasks.length} 서브태스크
                          </span>
                          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expandedTasks.has(task.id) && "rotate-90")} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 absolute right-5 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl px-2 py-1.5 rounded-xl border border-slate-100 shadow-sm z-10">
                    <AgendaTaskContextMenu 
                      status={task.status} 
                      onEdit={() => openDetail(task)} 
                      onChangeStatus={(s) => setTaskStatus(task.id, s)} 
                      onPermanentDelete={() => deleteTask(task.id)}
                    />
                  </div>
                </div>

                {/* Subtasks Accordion */}
                <AnimatePresence>
                  {expandedTasks.has(task.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-14 pr-4 pb-2 space-y-2">
                        {task.subtasks?.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 p-2.5 bg-white/50 border border-slate-100 shadow-sm rounded-xl group/sub hover:bg-white/80 transition-colors">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateSubtask(task.id, sub.id, { is_completed: !sub.is_completed }); }}
                              className="shrink-0"
                            >
                              {sub.is_completed ? (
                                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 group-hover/sub:text-indigo-400" />
                              )}
                            </button>
                            
                            {editingSubtaskId === sub.id ? (
                              <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  value={editSubtaskTitle}
                                  onChange={e => setEditSubtaskTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (editSubtaskTitle.trim()) {
                                        updateSubtask(task.id, sub.id, { title: editSubtaskTitle.trim() });
                                      }
                                      setEditingSubtaskId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingSubtaskId(null);
                                    }
                                  }}
                                  className="flex-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button 
                                  onClick={() => {
                                    if (editSubtaskTitle.trim()) {
                                      updateSubtask(task.id, sub.id, { title: editSubtaskTitle.trim() });
                                    }
                                    setEditingSubtaskId(null);
                                  }}
                                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"
                                >
                                  저장
                                </button>
                              </div>
                            ) : (
                              <span className={cn("font-bold text-sm flex-1", sub.is_completed ? "text-slate-400 line-through" : "text-slate-600")}>
                                {sub.title}
                              </span>
                            )}

                            {!editingSubtaskId && (
                              <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 transition-opacity">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubtaskId(sub.id);
                                    setEditSubtaskTitle(sub.title);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-md hover:bg-indigo-50 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteSubtask(task.id, sub.id); }}
                                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <form onSubmit={(e) => handleQuickAddSubtask(task.id, e)} className="relative mt-2" onClick={e => e.stopPropagation()}>
                          <input 
                            value={newSubtaskTitles[task.id] || ''}
                            onChange={e => setNewSubtaskTitles(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="하위 작업 추가 후 엔터..."
                            className="w-full bg-white/50 border border-transparent shadow-sm rounded-xl px-4 py-2.5 pl-9 font-bold text-[13px] focus-visible:ring-2 focus-visible:ring-indigo-500/30 text-slate-700 placeholder:text-slate-400 transition-all focus:bg-white"
                          />
                          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )
            })
          )}
        </div>
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
