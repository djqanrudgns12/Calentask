'use client'

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CheckCircle2, Circle, Clock, Trash2, 
  Archive as ArchiveIcon, Calendar, 
  Plus, Check, ChevronRight, CheckSquare, AlignLeft, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseNLPDate } from '@/lib/nlp';
import { AgendaTaskContextMenu } from './AgendaTaskContextMenu';
import { EditAgendaTaskDialog } from './EditAgendaTaskDialog';

import { useAgendaStore, TaskStatus, AgendaTask } from '@/store/useAgendaStore';
import { useCategories } from '@/hooks/useCalendarQueries';
import { useCalendarStore } from '@/store/useCalendarStore';

const TABS: { id: TaskStatus; label: string; icon: any }[] = [
  { id: 'inbox', label: '진행 대기', icon: Circle },
  { id: 'done', label: '완료', icon: CheckCircle2 },
  { id: 'archive', label: '보관함', icon: ArchiveIcon },
  { id: 'trash', label: '휴지통', icon: Trash2 },
];

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

  // Detail Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgendaTask> | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setParsedData(parseNLPDate(val));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData.title.trim()) return;

    addTask({
      title: parsedData.title,
      memo: null,
      deadline: parsedData.date ? parsedData.date.toISOString() : null,
      category_id: null,
    });
    
    setInputValue('');
    setParsedData({ title: '', date: null, hasTime: false });
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

        {/* Input Form */}
        <form onSubmit={handleAddTask} className="relative group shrink-0 mb-10">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Plus className="w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input 
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="예: '내일 오후 3시 팀 미팅 준비'"
            className="w-full h-16 pl-14 pr-6 bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 outline-none focus:border-indigo-400 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-800 font-bold text-xl placeholder:text-slate-400 placeholder:font-medium"
          />
          {parsedData.date && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-indigo-500 rounded-xl shadow-md">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-sm font-extrabold text-white uppercase tracking-wide">
                {format(parsedData.date, 'MMM d, a h:mm', { locale: ko })}
              </span>
            </div>
          )}
        </form>

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
